namespace WardWebsite.API.Models
{
    public class Comment
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public int ArticleId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Article? Article { get; set; }
    }
}
