using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WardWebsite.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminLogPurgeUndoBackup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminActionLogPurgeBackups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurgedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RetentionDays = table.Column<int>(type: "int", nullable: false),
                    CutoffUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedCount = table.Column<int>(type: "int", nullable: false),
                    LogsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PurgedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RestoredAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RestoredBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RestoredCount = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminActionLogPurgeBackups", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminActionLogPurgeBackups");
        }
    }
}
