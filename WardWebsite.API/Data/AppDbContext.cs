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
        public DbSet<Service> Services { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<Media> Media { get; set; }
        public DbSet<ContactMessage> ContactMessages { get; set; }
        public DbSet<AdminActionLog> AdminActionLogs { get; set; }

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
                new User { Id = 1, Username = "demo", PasswordHash = "$2a$10$W7zrB2IPc3.lTGivsqKAL.VfLpX0K037/K5mqaQdAPmIlI35NZWPe", RoleId = 3 }
            );

            // Seed initial categories
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, Name = "Tin Tức" },
                new Category { Id = 2, Name = "Thông Báo" },
                new Category { Id = 3, Name = "Sự Kiện" },
                new Category { Id = 4, Name = "Chính Sách" }
            );

            // User - Role relationship
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

            // Comment - Article relationship
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Article)
                .WithMany(a => a.Comments)
                .HasForeignKey(c => c.ArticleId)
                .OnDelete(DeleteBehavior.Cascade);

            // Seed services
            modelBuilder.Entity<Service>().HasData(
                new Service { Id = 1, Name = "Cấp CMND", Description = "Dịch vụ cấp chứng minh nhân dân" },
                new Service { Id = 2, Name = "Cấp sổ hộ khẩu", Description = "Dịch vụ cấp/thay đổi sổ hộ khẩu" },
                new Service { Id = 3, Name = "Thủ tục hôn nhân", Description = "Dịch vụ đăng ký hôn nhân" },
                new Service { Id = 4, Name = "Cấp giấy khai sinh", Description = "Dịch vụ cấp giấy khai sinh" }
            );

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
        }
    }
}
