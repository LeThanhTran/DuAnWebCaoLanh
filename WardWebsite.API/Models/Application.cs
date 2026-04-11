namespace WardWebsite.API.Models
{
    public class Application
    {
        public int Id { get; set; }
        public string LookupCode { get; set; } = string.Empty;
        public string CreatedByUsername { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int ServiceId { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Processing, Approved, Rejected, PendingInfo
        public string? Notes { get; set; } // For rejection reason or additional info
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Service? Service { get; set; }
    }
}
