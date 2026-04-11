using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Models;

namespace WardWebsite.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Article> Articles { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<CommentReaction> CommentReactions { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<DownloadForm> DownloadForms { get; set; }
        public DbSet<Media> Media { get; set; }
        public DbSet<ContactMessage> ContactMessages { get; set; }
        public DbSet<AdminActionLog> AdminActionLogs { get; set; }
        public DbSet<AdminActionLogPurgeBackup> AdminActionLogPurgeBackups { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Seed initial roles
            modelBuilder.Entity<Role>().HasData(
                new Role { Id = 1, Name = "Admin" },
                new Role { Id = 2, Name = "Editor" },
                new Role { Id = 3, Name = "Viewer" }
            );

            // Seed demo user (username: demo, password: 123456)
            // Hash pre-calculated: BCrypt.HashPassword("123456") with rounds=10
            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Username = "demo",
                    PasswordHash = "$2a$10$W7zrB2IPc3.lTGivsqKAL.VfLpX0K037/K5mqaQdAPmIlI35NZWPe",
                    RoleId = 3,
                    CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );

            // Seed initial categories
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, Name = "Tin Tức" },
                new Category { Id = 2, Name = "Thông Báo" },
                new Category { Id = 3, Name = "Sự Kiện" },
                new Category { Id = 4, Name = "Chính Sách" }
            );

            modelBuilder.Entity<Category>()
                .Property(c => c.IsDeleted)
                .HasDefaultValue(false);

            modelBuilder.Entity<Category>()
                .Property(c => c.DeletedBy)
                .HasMaxLength(100);

            // User - Role relationship
            modelBuilder.Entity<User>()
                .Property(u => u.Username)
                .HasMaxLength(100);

            modelBuilder.Entity<User>()
                .Property(u => u.FullName)
                .HasMaxLength(150);

            modelBuilder.Entity<User>()
                .Property(u => u.Email)
                .HasMaxLength(150);

            modelBuilder.Entity<User>()
                .Property(u => u.PhoneNumber)
                .HasMaxLength(30);

            modelBuilder.Entity<User>()
                .Property(u => u.Address)
                .HasMaxLength(300);

            modelBuilder.Entity<User>()
                .Property(u => u.AvatarUrl)
                .HasMaxLength(500);

            modelBuilder.Entity<User>()
                .Property(u => u.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<User>()
                .Property(u => u.UpdatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            // Article - Category relationship
            modelBuilder.Entity<Article>()
                .HasOne(a => a.Category)
                .WithMany(c => c.Articles)
                .HasForeignKey(a => a.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Article>()
                .Property(a => a.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Draft");

            modelBuilder.Entity<Article>()
                .Property(a => a.ReviewedBy)
                .HasMaxLength(100);

            modelBuilder.Entity<Article>()
                .Property(a => a.PublishedBy)
                .HasMaxLength(100);

            modelBuilder.Entity<Article>()
                .Property(a => a.ReviewNote)
                .HasMaxLength(1000);

            modelBuilder.Entity<Article>()
                .Property(a => a.IsDeleted)
                .HasDefaultValue(false);

            modelBuilder.Entity<Article>()
                .Property(a => a.DeletedBy)
                .HasMaxLength(100);

            modelBuilder.Entity<Article>()
                .Property(a => a.ViewCount)
                .HasDefaultValue(0);

            // Comment - Article relationship
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Article)
                .WithMany(a => a.Comments)
                .HasForeignKey(c => c.ArticleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Comment>()
                .Property(c => c.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Pending");

            modelBuilder.Entity<Comment>()
                .Property(c => c.ReviewedBy)
                .HasMaxLength(100);

            modelBuilder.Entity<Comment>()
                .Property(c => c.ReviewNote)
                .HasMaxLength(1000);

            modelBuilder.Entity<Comment>()
                .Property(c => c.CreatedByUsername)
                .HasMaxLength(100);

            modelBuilder.Entity<Comment>()
                .Property(c => c.LikeCount)
                .HasDefaultValue(0);

            modelBuilder.Entity<Comment>()
                .Property(c => c.DislikeCount)
                .HasDefaultValue(0);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<CommentReaction>()
                .Property(r => r.Username)
                .HasMaxLength(100);

            modelBuilder.Entity<CommentReaction>()
                .Property(r => r.ReactionType)
                .HasMaxLength(20);

            modelBuilder.Entity<CommentReaction>()
                .HasOne(r => r.Comment)
                .WithMany(c => c.Reactions)
                .HasForeignKey(r => r.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CommentReaction>()
                .HasIndex(r => new { r.CommentId, r.Username })
                .IsUnique();

            // Seed services
            modelBuilder.Entity<Service>().HasData(
                new Service { Id = 1, Name = "Cấp CCCD", Description = "Dịch vụ cấp căn cước công dân" },
                new Service { Id = 2, Name = "Đăng ký & thay đổi thông tin cư trú", Description = "Dịch vụ đăng ký và thay đổi thông tin cư trú" },
                new Service { Id = 3, Name = "Thủ tục hôn nhân", Description = "Dịch vụ đăng ký hôn nhân" },
                new Service { Id = 4, Name = "Cấp giấy khai sinh", Description = "Dịch vụ cấp giấy khai sinh" }
            );

            modelBuilder.Entity<Service>()
                .Property(s => s.Name)
                .HasMaxLength(200);

            modelBuilder.Entity<Service>()
                .Property(s => s.Description)
                .HasMaxLength(2000);

            modelBuilder.Entity<Service>()
                .Property(s => s.IsDeleted)
                .HasDefaultValue(false);

            modelBuilder.Entity<Service>()
                .Property(s => s.DeletedBy)
                .HasMaxLength(100);

            // Seed media
            modelBuilder.Entity<Media>().HasData(
                new Media { Id = 1, Url = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=300&fit=crop", Type = "Image" },
                new Media { Id = 2, Url = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop", Type = "Image" },
                new Media { Id = 3, Url = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop", Type = "Image" },
                new Media { Id = 4, Url = "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop", Type = "Image" },
                new Media { Id = 5, Url = "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop", Type = "Image" },
                new Media { Id = 6, Url = "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop", Type = "Image" }
            );

            // Application - Service relationship
            modelBuilder.Entity<Application>()
                .HasOne(app => app.Service)
                .WithMany(s => s.Applications)
                .HasForeignKey(app => app.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Application>()
                .Property(app => app.LookupCode)
                .HasMaxLength(40);

            modelBuilder.Entity<Application>()
                .Property(app => app.CreatedByUsername)
                .HasMaxLength(100);

            modelBuilder.Entity<Application>()
                .Property(app => app.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Pending");

            modelBuilder.Entity<Application>()
                .HasIndex(app => app.LookupCode)
                .IsUnique();

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.Title)
                .HasMaxLength(200);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.Description)
                .HasMaxLength(1000);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.OriginalFileName)
                .HasMaxLength(260);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.FileExtension)
                .HasMaxLength(20);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.UploadedBy)
                .HasMaxLength(100);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.IsActive)
                .HasDefaultValue(true);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.SortOrder)
                .HasDefaultValue(0);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.DownloadCount)
                .HasDefaultValue(0);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.IsDeleted)
                .HasDefaultValue(false);

            modelBuilder.Entity<DownloadForm>()
                .Property(f => f.DeletedBy)
                .HasMaxLength(100);

            modelBuilder.Entity<DownloadForm>()
                .HasOne(f => f.Service)
                .WithMany(s => s.DownloadForms)
                .HasForeignKey(f => f.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<AdminActionLogPurgeBackup>()
                .Property(x => x.PurgedBy)
                .HasMaxLength(100);

            modelBuilder.Entity<AdminActionLogPurgeBackup>()
                .Property(x => x.RestoredBy)
                .HasMaxLength(100);

            modelBuilder.Entity<AdminActionLogPurgeBackup>()
                .Property(x => x.LogsJson)
                .HasColumnType("nvarchar(max)");
        }
    }
}
