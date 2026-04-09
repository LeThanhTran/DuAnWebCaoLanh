using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WardWebsite.API.Migrations
{
    /// <inheritdoc />
    public partial class RenameHouseholdServiceToResidenceInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Dịch vụ đăng ký và thay đổi thông tin cư trú", "Đăng ký & thay đổi thông tin cư trú" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Dịch vụ cấp/thay đổi sổ hộ khẩu", "Cấp sổ hộ khẩu" });
        }
    }
}
