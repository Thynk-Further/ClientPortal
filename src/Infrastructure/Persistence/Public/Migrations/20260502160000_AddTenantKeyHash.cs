using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Public.Migrations;

/// <inheritdoc />
public partial class AddTenantKeyHash : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "TenantKeyHash",
            schema: "public",
            table: "tenants",
            type: "character varying(64)",
            maxLength: 64,
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_tenants_TenantKeyHash",
            schema: "public",
            table: "tenants",
            column: "TenantKeyHash",
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_tenants_TenantKeyHash",
            schema: "public",
            table: "tenants");

        migrationBuilder.DropColumn(
            name: "TenantKeyHash",
            schema: "public",
            table: "tenants");
    }
}
