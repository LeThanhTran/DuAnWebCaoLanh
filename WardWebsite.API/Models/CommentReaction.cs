namespace WardWebsite.API.Models
{
    public class CommentReaction
    {
        public int Id { get; set; }
        public int CommentId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string ReactionType { get; set; } = string.Empty; // Like | Dislike
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Comment? Comment { get; set; }
    }
}
