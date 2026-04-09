namespace WardWebsite.API.Models
{
    public class DownloadFormDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string FileExtension { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public int? ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public int DownloadCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string UploadedBy { get; set; } = string.Empty;
        public string DownloadEndpoint { get; set; } = string.Empty;
    }

    public class UpdateDownloadFormDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? ServiceId { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; }
    }
}
