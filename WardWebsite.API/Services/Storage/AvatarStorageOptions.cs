namespace WardWebsite.API.Services.Storage
{
    public class AvatarStorageOptions
    {
        public string Provider { get; set; } = "Local";
        public string? LocalBaseUrl { get; set; }
        public AzureBlobAvatarStorageOptions AzureBlob { get; set; } = new();
    }

    public class AzureBlobAvatarStorageOptions
    {
        public string? ConnectionString { get; set; }
        public string ContainerName { get; set; } = "avatars";
        public string PathPrefix { get; set; } = "avatars";
    }
}
