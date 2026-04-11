namespace WardWebsite.API.Models
{
    public class Comment
    {
        public int Id { get; set; }
        public string Content { get; set; } = string.Empty;
        public string CreatedByUsername { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
        public string? ReviewNote { get; set; }
        public int ArticleId { get; set; }
        public int? ParentCommentId { get; set; }
        public int LikeCount { get; set; }
        public int DislikeCount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Article? Article { get; set; }
        public Comment? ParentComment { get; set; }
        public ICollection<Comment> Replies { get; set; } = new List<Comment>();
        public ICollection<CommentReaction> Reactions { get; set; } = new List<CommentReaction>();
    }
}
