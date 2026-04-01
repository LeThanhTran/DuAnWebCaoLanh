using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WardWebsite.API.Data;

namespace WardWebsite.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StatsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetStats()
        {
            var totalArticles = await _context.Articles.CountAsync();
            var totalUsers = await _context.Users.CountAsync();
            var totalApplications = await _context.Applications.CountAsync();
            var totalComments = await _context.Comments.CountAsync();

            // Comments by article (top 5)
            var commentsByArticle = await _context.Articles
                .Select(a => new
                {
                    title = a.Title.Length > 30 ? a.Title.Substring(0, 30) + "..." : a.Title,
                    count = a.Comments.Count
                })
                .OrderByDescending(x => x.count)
                .Take(5)
                .ToListAsync();

            // Applications by status
            var applicationsByStatus = await _context.Applications
                .GroupBy(a => a.Status)
                .Select(g => new
                {
                    status = g.Key,
                    count = g.Count()
                })
                .ToListAsync();

            // Users by role
            var usersByRole = await _context.Users
                .Include(u => u.Role)
                .GroupBy(u => u.Role!.Name)
                .Select(g => new
                {
                    role = g.Key,
                    count = g.Count()
                })
                .ToListAsync();

            return Ok(new
            {
                summary = new
                {
                    totalArticles,
                    totalUsers,
                    totalApplications,
                    totalComments
                },
                commentsByArticle,
                applicationsByStatus,
                usersByRole
            });
        }
    }
}
