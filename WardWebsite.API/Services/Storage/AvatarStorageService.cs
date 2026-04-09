using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;

namespace WardWebsite.API.Services.Storage
{
    public class AvatarStorageService : IAvatarStorageService
    {
        private readonly IWebHostEnvironment _environment;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AvatarStorageOptions _options;
        private readonly ILogger<AvatarStorageService> _logger;

        public AvatarStorageService(
            IWebHostEnvironment environment,
            IHttpContextAccessor httpContextAccessor,
            IOptions<AvatarStorageOptions> options,
            ILogger<AvatarStorageService> logger)
        {
            _environment = environment;
            _httpContextAccessor = httpContextAccessor;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<string> SaveAvatarAsync(IFormFile file, CancellationToken cancellationToken = default)
        {
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"{Guid.NewGuid():N}{extension}";

            if (ShouldUseAzureBlob())
            {
                return await SaveToAzureBlobAsync(file, fileName, cancellationToken);
            }

            return await SaveToLocalStorageAsync(file, fileName, cancellationToken);
        }

        public async Task DeleteAvatarIfOwnedAsync(string? avatarUrl, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(avatarUrl))
            {
                return;
            }

            try
            {
                if (ShouldUseAzureBlob())
                {
                    await TryDeleteFromAzureBlobAsync(avatarUrl, cancellationToken);
                }

                TryDeleteFromLocalStorage(avatarUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Avatar cleanup failed for URL {AvatarUrl}", avatarUrl);
            }
        }

        private bool ShouldUseAzureBlob()
        {
            return string.Equals(_options.Provider, "AzureBlob", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(_options.AzureBlob.ConnectionString);
        }

        private async Task<string> SaveToAzureBlobAsync(IFormFile file, string fileName, CancellationToken cancellationToken)
        {
            var blobOptions = _options.AzureBlob;
            var connectionString = blobOptions.ConnectionString ?? string.Empty;
            var containerName = string.IsNullOrWhiteSpace(blobOptions.ContainerName)
                ? "avatars"
                : blobOptions.ContainerName.Trim().ToLowerInvariant();

            var pathPrefix = NormalizePathPrefix(blobOptions.PathPrefix);
            var blobName = string.IsNullOrWhiteSpace(pathPrefix)
                ? fileName
                : $"{pathPrefix}/{fileName}";

            var containerClient = new BlobContainerClient(connectionString, containerName);
            await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken);

            var blobClient = containerClient.GetBlobClient(blobName);
            var contentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? "application/octet-stream"
                : file.ContentType;

            await using (var stream = file.OpenReadStream())
            {
                await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: cancellationToken);
            }

            return blobClient.Uri.ToString();
        }

        private async Task<string> SaveToLocalStorageAsync(IFormFile file, string fileName, CancellationToken cancellationToken)
        {
            var webRootPath = GetWebRootPath();
            var avatarDirectory = Path.Combine(webRootPath, "uploads", "avatars");
            Directory.CreateDirectory(avatarDirectory);

            var filePath = Path.Combine(avatarDirectory, fileName);
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            var localBaseUrl = _options.LocalBaseUrl?.Trim();
            if (!string.IsNullOrWhiteSpace(localBaseUrl))
            {
                return $"{localBaseUrl.TrimEnd('/')}/uploads/avatars/{fileName}";
            }

            var request = _httpContextAccessor.HttpContext?.Request;
            if (request != null)
            {
                return $"{request.Scheme}://{request.Host}/uploads/avatars/{fileName}";
            }

            return $"/uploads/avatars/{fileName}";
        }

        private async Task TryDeleteFromAzureBlobAsync(string avatarUrl, CancellationToken cancellationToken)
        {
            if (!Uri.TryCreate(avatarUrl, UriKind.Absolute, out var avatarUri))
            {
                return;
            }

            var blobOptions = _options.AzureBlob;
            var connectionString = blobOptions.ConnectionString ?? string.Empty;
            var containerName = string.IsNullOrWhiteSpace(blobOptions.ContainerName)
                ? "avatars"
                : blobOptions.ContainerName.Trim().ToLowerInvariant();

            var containerClient = new BlobContainerClient(connectionString, containerName);
            if (!string.Equals(avatarUri.Host, containerClient.Uri.Host, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var containerPathPrefix = containerClient.Uri.AbsolutePath.TrimEnd('/');
            var avatarPath = avatarUri.AbsolutePath;
            if (!avatarPath.StartsWith(containerPathPrefix + "/", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var blobName = Uri.UnescapeDataString(avatarPath[(containerPathPrefix.Length + 1)..]);
            if (string.IsNullOrWhiteSpace(blobName))
            {
                return;
            }

            await containerClient.GetBlobClient(blobName).DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }

        private void TryDeleteFromLocalStorage(string avatarUrl)
        {
            string? relativePath = null;

            if (Uri.TryCreate(avatarUrl, UriKind.Absolute, out var absoluteUri))
            {
                if (!IsOwnedLocalHost(absoluteUri.Host))
                {
                    return;
                }

                relativePath = absoluteUri.AbsolutePath.TrimStart('/');
            }
            else
            {
                relativePath = avatarUrl.TrimStart('/');
            }

            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return;
            }

            var webRootPath = GetWebRootPath();
            var avatarsRoot = Path.GetFullPath(Path.Combine(webRootPath, "uploads", "avatars"));
            var normalizedRelativePath = relativePath.Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.GetFullPath(Path.Combine(webRootPath, normalizedRelativePath));

            if (!fullPath.StartsWith(avatarsRoot, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            try
            {
                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }
            }
            catch
            {
                // Ignore cleanup errors to avoid breaking profile update flow.
            }
        }

        private bool IsOwnedLocalHost(string host)
        {
            var requestHost = _httpContextAccessor.HttpContext?.Request.Host.Host;
            if (!string.IsNullOrWhiteSpace(requestHost)
                && string.Equals(host, requestHost, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var localBaseUrl = _options.LocalBaseUrl?.Trim();
            if (!string.IsNullOrWhiteSpace(localBaseUrl)
                && Uri.TryCreate(localBaseUrl, UriKind.Absolute, out var localBaseUri)
                && string.Equals(host, localBaseUri.Host, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return false;
        }

        private string GetWebRootPath()
        {
            return string.IsNullOrWhiteSpace(_environment.WebRootPath)
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : _environment.WebRootPath;
        }

        private static string NormalizePathPrefix(string? pathPrefix)
        {
            if (string.IsNullOrWhiteSpace(pathPrefix))
            {
                return string.Empty;
            }

            return pathPrefix.Trim().Trim('/').Replace("\\", "/");
        }
    }
}
