using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AttendanceAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckInPhotoUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Users]') AND name = 'MustChangePassword')
                BEGIN
                    ALTER TABLE [Users] ADD [MustChangePassword] BIT NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.AddColumn<string>(
                name: "CheckInPhotoUrl",
                table: "AttendanceRecords",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckInPhotoUrl",
                table: "AttendanceRecords");
        }
    }
}
