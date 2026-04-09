namespace WardWebsite.API.Models
{
    public class AdminActionLogPurgeBackup
    {
        public int Id { get; set; }
        public string PurgedBy { get; set; } = string.Empty;
        public int RetentionDays { get; set; }
        public DateTime CutoffUtc { get; set; }
        public int DeletedCount { get; set; }
        public string LogsJson { get; set; } = string.Empty;
        public DateTime PurgedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? RestoredAtUtc { get; set; }
        public string? RestoredBy { get; set; }
        public int? RestoredCount { get; set; }
    }
}
