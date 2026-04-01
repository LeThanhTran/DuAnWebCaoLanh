namespace WardWebsite.API.Models
{
    public class Article
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int CategoryId { get; set; }

        public Category? Category { get; set; }
        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    }
}
