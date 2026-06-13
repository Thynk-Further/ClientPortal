using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRfqTitleAndQuotationDueAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "quotation_due_at_utc",
                table: "rfqs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "(NOW() AT TIME ZONE 'UTC') + INTERVAL '7 days'");

            migrationBuilder.AddColumn<string>(
                name: "title",
                table: "rfqs",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "Untitled");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "quotation_due_at_utc",
                table: "rfqs");

            migrationBuilder.DropColumn(
                name: "title",
                table: "rfqs");
        }
    }
}
