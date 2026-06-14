using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingScheduledTimeZoneId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "scheduled_time_zone_id",
                table: "meetings",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Africa/Harare");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "scheduled_time_zone_id",
                table: "meetings");
        }
    }
}
