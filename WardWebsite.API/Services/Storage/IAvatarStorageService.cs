namespace WardWebsite.API.Services.Storage
{
    public interface IAvatarStorageService
    {
        Task<string> SaveAvatarAsync(IFormFile file, CancellationToken cancellationToken = default);
        Task DeleteAvatarIfOwnedAsync(string? avatarUrl, CancellationToken cancellationToken = default);
    }
}
