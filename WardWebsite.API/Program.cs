using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WardWebsite.API.Data;
using WardWebsite.API.Models;
using WardWebsite.API.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure()
    )
);

// Register repositories
builder.Services.AddScoped<ApplicationRepository>();

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
var key = System.Text.Encoding.UTF8.GetBytes(jwtSecret);

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
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

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

    // Create or update Admin account
    var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
    var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");

    if (adminUser == null)
    {
        db.Users.Add(new User
        {
            Username = "admin",
            PasswordHash = adminPasswordHash,
            RoleId = adminRole.Id
        });
    }
    else
    {
        adminUser.PasswordHash = adminPasswordHash;
        adminUser.RoleId = adminRole.Id;
    }

    // Create or update Editor account
    var editorUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "editor");
    var editorPasswordHash = BCrypt.Net.BCrypt.HashPassword("editor123");

    if (editorUser == null)
    {
        db.Users.Add(new User
        {
            Username = "editor",
            PasswordHash = editorPasswordHash,
            RoleId = editorRole.Id
        });
    }
    else
    {
        editorUser.PasswordHash = editorPasswordHash;
        editorUser.RoleId = editorRole.Id;
    }

    // Create or update Viewer account
    var viewerUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "viewer");
    var viewerPasswordHash = BCrypt.Net.BCrypt.HashPassword("viewer123");

    if (viewerUser == null)
    {
        db.Users.Add(new User
        {
            Username = "viewer",
            PasswordHash = viewerPasswordHash,
            RoleId = viewerRole.Id
        });
    }
    else
    {
        viewerUser.PasswordHash = viewerPasswordHash;
        viewerUser.RoleId = viewerRole.Id;
    }

    await db.SaveChangesAsync();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
