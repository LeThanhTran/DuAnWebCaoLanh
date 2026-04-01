using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace WardWebsite.API.Migrations
{
    /// <inheritdoc />
    public partial class AddContactMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Applications",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.CreateTable(
                name: "ContactMessages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsHandled = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactMessages", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContactMessages");

            migrationBuilder.InsertData(
                table: "Applications",
                columns: new[] { "Id", "Address", "CreatedAt", "FullName", "Notes", "Phone", "ServiceId", "Status" },
                values: new object[,]
                {
                    { 1, "123 Đường Lý Thái Tổ, TP Cao Lãnh", new DateTime(2026, 3, 27, 17, 52, 17, 247, DateTimeKind.Utc).AddTicks(7325), "Nguyễn Văn A", null, "0912345678", 1, "Pending" },
                    { 2, "456 Đường Hùng Vương, TP Cao Lãnh", new DateTime(2026, 3, 28, 17, 52, 17, 247, DateTimeKind.Utc).AddTicks(7332), "Trần Thị B", null, "0998765432", 2, "Processing" },
                    { 3, "789 Đường Cách Mạng Tháng 8, TP Cao Lãnh", new DateTime(2026, 3, 29, 17, 52, 17, 247, DateTimeKind.Utc).AddTicks(7333), "Phạm Văn C", null, "0934567890", 3, "Pending" },
                    { 4, "321 Đường Trần Hưng Đạo, TP Cao Lãnh", new DateTime(2026, 3, 25, 17, 52, 17, 247, DateTimeKind.Utc).AddTicks(7335), "Lê Thị D", "Đã phê duyệt - Nộp hồ sơ thêm", "0912341234", 4, "Approved" },
                    { 5, "654 Đường Phan Bội Châu, TP Cao Lãnh", new DateTime(2026, 3, 23, 17, 52, 17, 247, DateTimeKind.Utc).AddTicks(7336), "Vũ Văn E", "Thiếu giấy tờ chứng thực", "0956789012", 1, "Rejected" }
                });
        }
    }
}
