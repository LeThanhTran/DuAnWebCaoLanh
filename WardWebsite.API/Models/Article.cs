namespace WardWebsite.API.Models
{
    public class Article
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Status { get; set; } = "Draft";
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public string? ReviewNote { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string? PublishedBy { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int ViewCount { get; set; } = 0;
        public int CategoryId { get; set; }

        public Category? Category { get; set; }
        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    }
}
