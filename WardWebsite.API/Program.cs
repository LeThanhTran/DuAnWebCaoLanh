using System.Text;
using System.Threading.RateLimiting;
using System.Net;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using WardWebsite.API.Data;
using WardWebsite.API.Models;
using WardWebsite.API.Repositories;
using WardWebsite.API.Services.Storage;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure()
    )
);

builder.Services.Configure<AvatarStorageOptions>(builder.Configuration.GetSection("AvatarStorage"));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAvatarStorageService, AvatarStorageService>();

// Register repositories
builder.Services.AddScoped<ApplicationRepository>();

var defaultCorsOrigins = new[]
{
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173"
};

var configuredCorsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
var allowedCorsOrigins = (configuredCorsOrigins is { Length: > 0 } ? configuredCorsOrigins : defaultCorsOrigins)
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException("Configuration value Jwt:Secret must be at least 32 characters.");
}

var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendOnly", policy =>
    {
        policy.WithOrigins(allowedCorsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WardWebsite API",
        Version = "v1",
        Description = "API tai lieu cho he thong thong tin phuong/xa"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhap token theo dinh dang: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

string ResolveSiteUrl(HttpContext context)
{
    var configuredSiteUrl = builder.Configuration["Seo:SiteUrl"];
    if (!string.IsNullOrWhiteSpace(configuredSiteUrl) && Uri.TryCreate(configuredSiteUrl, UriKind.Absolute, out var configuredUri))
    {
        return configuredUri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
    }

    var host = context.Request.Host.HasValue ? context.Request.Host.Value : "localhost";
    var scheme = context.Request.Scheme;
    return $"{scheme}://{host}";
}

string NormalizeRequestPath(PathString requestPath)
{
    var path = requestPath.HasValue ? requestPath.Value! : "/";
    if (string.IsNullOrWhiteSpace(path))
    {
        return "/";
    }

    return path.Length > 1 ? path.TrimEnd('/') : path;
}

string ExtractTextSnippet(string? html, int maxLength = 170)
{
    if (string.IsNullOrWhiteSpace(html))
    {
        return string.Empty;
    }

    var plainText = Regex.Replace(html, "<[^>]+>", " ");
    plainText = WebUtility.HtmlDecode(plainText);
    plainText = Regex.Replace(plainText, @"\s+", " ").Trim();

    if (plainText.Length <= maxLength)
    {
        return plainText;
    }

    return plainText[..(maxLength - 3)].TrimEnd() + "...";
}

(string Title, string Description) GetSeoByPath(string normalizedPath)
{
    return normalizedPath switch
    {
        "/" => (
            "Trang chủ - Phường Cao Lãnh",
            "Tin tức mới nhất, thông báo và thông tin hành chính dành cho người dân Phường Cao Lãnh."
        ),
        "/gioi-thieu" => (
            "Giới thiệu - Phường Cao Lãnh",
            "Thông tin tổng quan, lịch sử hình thành và định hướng phát triển của Phường Cao Lãnh."
        ),
        "/articles" => (
            "Tin tức - Phường Cao Lãnh",
            "Cập nhật tin tức, thông báo và các hoạt động nổi bật của địa phương."
        ),
        "/services" => (
            "Dịch vụ hành chính - Phường Cao Lãnh",
            "Danh mục dịch vụ hành chính công và thông tin thủ tục tại Phường Cao Lãnh."
        ),
        "/submit-application" => (
            "Nộp hồ sơ trực tuyến - Phường Cao Lãnh",
            "Nộp hồ sơ hành chính trực tuyến nhanh chóng, minh bạch và thuận tiện cho người dân."
        ),
        "/tra-cuu-ho-so" => (
            "Tra cứu hồ sơ - Phường Cao Lãnh",
            "Tra cứu trạng thái xử lý hồ sơ theo mã tra cứu và số điện thoại đã đăng ký."
        ),
        "/bieu-mau" => (
            "Biểu mẫu tải về - Phường Cao Lãnh",
            "Tải biểu mẫu hành chính phục vụ nộp hồ sơ và giao dịch hành chính công."
        ),
        "/contact" => (
            "Liên hệ - Phường Cao Lãnh",
            "Gửi phản ánh, kiến nghị và liên hệ với bộ phận tiếp nhận thông tin của địa phương."
        ),
        _ => (
            "Phường Cao Lãnh - Cổng thông tin và dịch vụ công trực tuyến",
            "Cổng thông tin điện tử Phường Cao Lãnh: tin tức địa phương, tra cứu hồ sơ, nộp hồ sơ trực tuyến và biểu mẫu hành chính."
        )
    };
}

async Task<(string Title, string Description)> BuildSeoByPathAsync(string normalizedPath, IServiceProvider services, CancellationToken cancellationToken)
{
    var defaults = GetSeoByPath(normalizedPath);

    var articleMatch = Regex.Match(normalizedPath, @"^/articles/(?<id>\d+)$", RegexOptions.IgnoreCase);
    if (!articleMatch.Success || !int.TryParse(articleMatch.Groups["id"].Value, out var articleId))
    {
        return defaults;
    }

    await using var scope = services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var article = await db.Articles
        .AsNoTracking()
        .Where(a => a.Id == articleId && a.Status == "Published")
        .Select(a => new { a.Title, a.Content })
        .FirstOrDefaultAsync(cancellationToken);

    if (article == null)
    {
        return defaults;
    }

    var description = ExtractTextSnippet(article.Content, 170);
    if (string.IsNullOrWhiteSpace(description))
    {
        description = defaults.Description;
    }

    return ($"{article.Title} - Tin tức - Phường Cao Lãnh", description);
}

string ReplaceTitleTag(string html, string title)
{
    var encoded = WebUtility.HtmlEncode(title);
    return Regex.Replace(
        html,
        @"<title>.*?</title>",
        $"<title>{encoded}</title>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline
    );
}

string ReplaceMetaTagContent(string html, string selectorAttribute, string selectorValue, string content)
{
    var encoded = WebUtility.HtmlEncode(content);
    var pattern =
        $@"(<meta\s+[^>]*{selectorAttribute}\s*=\s*[\""']{Regex.Escape(selectorValue)}[\""'][^>]*content\s*=\s*[\""'])([^\""']*)([\""'][^>]*>)";

    return Regex.Replace(
        html,
        pattern,
        match => $"{match.Groups[1].Value}{encoded}{match.Groups[3].Value}",
        RegexOptions.IgnoreCase
    );
}

string ReplaceCanonicalHref(string html, string href)
{
    var encoded = WebUtility.HtmlEncode(href);
    var pattern = @"(<link\s+[^>]*rel\s*=\s*[\""']canonical[\""'][^>]*href\s*=\s*[\""'])([^\""']*)([\""'][^>]*>)";

    return Regex.Replace(
        html,
        pattern,
        match => $"{match.Groups[1].Value}{encoded}{match.Groups[3].Value}",
        RegexOptions.IgnoreCase
    );
}

var enableSwagger = builder.Configuration.GetValue("Swagger:Enabled", app.Environment.IsDevelopment());
var requireHttps = builder.Configuration.GetValue("Security:RequireHttps", !app.Environment.IsDevelopment());

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(exceptionApp =>
    {
        exceptionApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new
            {
                title = "An unexpected server error occurred.",
                status = StatusCodes.Status500InternalServerError
            });
        });
    });

    app.UseHsts();
}

if (requireHttps)
{
    app.UseHttpsRedirection();
}

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.DocumentTitle = "WardWebsite API Docs";
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "WardWebsite API v1");
    });
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Ensure database exists and seed all roles and accounts
    db.Database.Migrate();

    // Create or get all roles
    var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
    if (adminRole == null)
    {
        adminRole = new Role { Name = "Admin" };
        db.Roles.Add(adminRole);
    }

    var editorRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Editor");
    if (editorRole == null)
    {
        editorRole = new Role { Name = "Editor" };
        db.Roles.Add(editorRole);
    }

    var viewerRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Viewer");
    if (viewerRole == null)
    {
        viewerRole = new Role { Name = "Viewer" };
        db.Roles.Add(viewerRole);
    }

    await db.SaveChangesAsync();

    var seedDefaultUsers = builder.Configuration.GetValue("Security:SeedDefaultUsers", builder.Environment.IsDevelopment());
    if (seedDefaultUsers)
    {
        var defaultUsersSection = builder.Configuration.GetSection("Security:DefaultUsers");
        var adminSeedPassword = defaultUsersSection["AdminPassword"] ?? "admin123";
        var editorSeedPassword = defaultUsersSection["EditorPassword"] ?? "editor123";
        var viewerSeedPassword = defaultUsersSection["ViewerPassword"] ?? "viewer123";

        // Create missing default accounts, but never overwrite existing passwords.
        var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
        if (adminUser == null)
        {
            db.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminSeedPassword),
                RoleId = adminRole.Id
            });
        }
        else if (adminUser.RoleId != adminRole.Id)
        {
            adminUser.RoleId = adminRole.Id;
        }

        var editorUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "editor");
        if (editorUser == null)
        {
            db.Users.Add(new User
            {
                Username = "editor",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(editorSeedPassword),
                RoleId = editorRole.Id
            });
        }
        else if (editorUser.RoleId != editorRole.Id)
        {
            editorUser.RoleId = editorRole.Id;
        }

        var viewerUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "viewer");
        if (viewerUser == null)
        {
            db.Users.Add(new User
            {
                Username = "viewer",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(viewerSeedPassword),
                RoleId = viewerRole.Id
            });
        }
        else if (viewerUser.RoleId != viewerRole.Id)
        {
            viewerUser.RoleId = viewerRole.Id;
        }

        await db.SaveChangesAsync();
    }
}

app.Use(async (context, next) =>
{
    context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
    context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
    context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");
    context.Response.Headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    await next();
});

app.UseCors("FrontendOnly");
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/robots.txt", (HttpContext context) =>
{
    var siteUrl = ResolveSiteUrl(context);
    var lines = string.Join('\n', new[]
    {
        "User-agent: *",
        "Allow: /",
        "",
        $"Sitemap: {siteUrl}/sitemap.xml"
    });

    return Results.Text(lines, "text/plain; charset=utf-8");
})
.AllowAnonymous();

app.MapGet("/sitemap.xml", async (HttpContext context, AppDbContext db, CancellationToken cancellationToken) =>
{
    var siteUrl = ResolveSiteUrl(context);
    XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";

    XElement BuildUrlNode(string path, string changeFreq, string priority, DateTime? lastModified = null)
    {
        var absoluteUrl = path == "/" ? $"{siteUrl}/" : $"{siteUrl}{path}";
        var node = new XElement(ns + "url",
            new XElement(ns + "loc", absoluteUrl),
            new XElement(ns + "changefreq", changeFreq),
            new XElement(ns + "priority", priority)
        );

        if (lastModified.HasValue)
        {
            node.Add(new XElement(ns + "lastmod", lastModified.Value.ToString("yyyy-MM-dd")));
        }

        return node;
    }

    var staticUrls = new List<XElement>
    {
        BuildUrlNode("/", "daily", "1.0"),
        BuildUrlNode("/gioi-thieu", "monthly", "0.7"),
        BuildUrlNode("/articles", "daily", "0.9"),
        BuildUrlNode("/services", "weekly", "0.8"),
        BuildUrlNode("/submit-application", "weekly", "0.8"),
        BuildUrlNode("/tra-cuu-ho-so", "weekly", "0.8"),
        BuildUrlNode("/bieu-mau", "weekly", "0.8"),
        BuildUrlNode("/contact", "monthly", "0.6")
    };

    var publishedArticles = await db.Articles
        .AsNoTracking()
        .Where(a => a.Status == "Published")
        .OrderByDescending(a => a.PublishedAt ?? a.CreatedAt)
        .Select(a => new
        {
            a.Id,
            LastModified = a.PublishedAt ?? a.CreatedAt
        })
        .ToListAsync(cancellationToken);

    var articleUrls = publishedArticles
        .Select(a => BuildUrlNode($"/articles/{a.Id}", "weekly", "0.7", a.LastModified))
        .ToList();

    var doc = new XDocument(
        new XDeclaration("1.0", "utf-8", "yes"),
        new XElement(ns + "urlset", staticUrls.Concat(articleUrls))
    );

    return Results.Text(doc.ToString(), "application/xml; charset=utf-8");
})
.AllowAnonymous();

app.MapControllers();

var webRootPath = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var spaIndexFile = Path.Combine(webRootPath, "index.html");
if (File.Exists(spaIndexFile))
{
    var spaIndexTemplate = await File.ReadAllTextAsync(spaIndexFile);

    app.MapFallback(async context =>
    {
        var normalizedPath = NormalizeRequestPath(context.Request.Path);
        var siteUrl = ResolveSiteUrl(context);
        var seo = await BuildSeoByPathAsync(normalizedPath, context.RequestServices, context.RequestAborted);
        var canonicalUrl = normalizedPath == "/" ? $"{siteUrl}/" : $"{siteUrl}{normalizedPath}";

        var html = spaIndexTemplate;
        html = ReplaceTitleTag(html, seo.Title);
        html = ReplaceMetaTagContent(html, "name", "description", seo.Description);
        html = ReplaceMetaTagContent(html, "property", "og:title", seo.Title);
        html = ReplaceMetaTagContent(html, "property", "og:description", seo.Description);
        html = ReplaceMetaTagContent(html, "property", "og:url", canonicalUrl);
        html = ReplaceMetaTagContent(html, "name", "twitter:title", seo.Title);
        html = ReplaceMetaTagContent(html, "name", "twitter:description", seo.Description);
        html = ReplaceCanonicalHref(html, canonicalUrl);

        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.WriteAsync(html);
    });
}

app.Run();
