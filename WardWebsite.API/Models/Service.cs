namespace WardWebsite.API.Models
{
    public class Service
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }

        public ICollection<Application> Applications { get; set; } = new List<Application>();
        public ICollection<DownloadForm> DownloadForms { get; set; } = new List<DownloadForm>();
    }
}
