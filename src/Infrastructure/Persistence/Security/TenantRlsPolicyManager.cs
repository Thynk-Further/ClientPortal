using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Security;

public sealed class TenantRlsPolicyManager : ITenantRlsPolicyManager
{
    public async Task ApplyPoliciesAsync(TenantDbContext dbContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);

        const string sql = """
            DO $rls$
            DECLARE
                schema_name text := current_schema();
                record_item record;
            BEGIN
                FOR record_item IN
                    SELECT t.tablename
                    FROM pg_tables AS t
                    WHERE t.schemaname = schema_name
                LOOP
                    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', schema_name, record_item.tablename);
                    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', schema_name, record_item.tablename);

                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'tenant_isolation_policy', schema_name, record_item.tablename);
                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'tenant_deny_all_policy', schema_name, record_item.tablename);

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns c
                        WHERE c.table_schema = schema_name
                          AND c.table_name = record_item.tablename
                          AND c.column_name = 'tenant_id'
                    ) THEN
                        EXECUTE format(
                            'CREATE POLICY %I ON %I.%I USING (current_setting(''app.current_tenant_id'', true) IS NOT NULL AND tenant_id::text = current_setting(''app.current_tenant_id'', true))',
                            'tenant_isolation_policy',
                            schema_name,
                            record_item.tablename);
                    ELSE
                        EXECUTE format(
                            'CREATE POLICY %I ON %I.%I USING (false)',
                            'tenant_deny_all_policy',
                            schema_name,
                            record_item.tablename);
                    END IF;
                END LOOP;
            END
            $rls$;
            """;
        await dbContext.Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}
