using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WardWebsite.API.Migrations
{
    /// <inheritdoc />
    public partial class RenameCmndToCccdServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Dịch vụ cấp căn cước công dân", "Cấp CCCD" });

            migrationBuilder.Sql(@"
                UPDATE [Services]
                SET [Name] = REPLACE([Name], N'CMND', N'CCCD'),
                    [Description] = REPLACE([Description], N'chứng minh nhân dân', N'căn cước công dân')
                WHERE [Name] LIKE N'%CMND%'
                   OR [Description] LIKE N'%chứng minh nhân dân%';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Services",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Dịch vụ cấp chứng minh nhân dân", "Cấp CMND" });

            migrationBuilder.Sql(@"
                UPDATE [Services]
                SET [Name] = REPLACE([Name], N'CCCD', N'CMND'),
                    [Description] = REPLACE([Description], N'căn cước công dân', N'chứng minh nhân dân')
                WHERE [Name] LIKE N'%CCCD%'
                   OR [Description] LIKE N'%căn cước công dân%';
            ");
        }
    }
}
