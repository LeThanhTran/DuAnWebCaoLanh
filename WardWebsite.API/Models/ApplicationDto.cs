namespace WardWebsite.API.Models
{
    // DTO for creating/updating applications
    public class CreateApplicationDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int ServiceId { get; set; }
    }

    public class ApplicationLookupRequestDto
    {
        public string? LookupCode { get; set; }
        public string? Phone { get; set; }
    }

    public class ApplicationLookupResultDto
    {
        public string LookupCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? ServiceName { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ApplicationLookupSuggestionDto
    {
        public string LookupCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string PhoneMasked { get; set; } = string.Empty;
        public string? ServiceName { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // DTO for updating application status
    public class UpdateApplicationStatusDto
    {
        public string Status { get; set; } = string.Empty; // Approved, Rejected, PendingInfo, Processing
        public string? Notes { get; set; }
    }

    // DTO for returning application data
    public class ApplicationDto
    {
        public int Id { get; set; }
        public string LookupCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
