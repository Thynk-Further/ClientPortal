using Application;
using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Documents;
using Application.Invoices;
using Application.Meetings;
using Application.Messaging.Abstractions;
using Application.Notifications;
using Api.BackgroundJobs;
using Api.Auth;
using Api.Clients;
using Api.Communication;
using Api.Contracts;
using Api.Documents;
using Api.HealthChecks;
using Api.Finance;
using Api.Invoices;
using Api.Middleware;
using Api.Notifications;
using Api.Projects;
using Api.Tenancy;
using Hangfire;
using Hangfire.PostgreSql;
using Infrastructure;
using Infrastructure.Auth;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
if (builder.Environment.IsDevelopment())
{
    builder.Host.UseDefaultServiceProvider(options =>
    {
        options.ValidateScopes = false;
        options.ValidateOnBuild = false;
    });
}

builder.Host.UseSerilog((context, _, loggerConfiguration) =>
{
    loggerConfiguration
        .MinimumLevel.Information()
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "ClientPortal.Api")
        .WriteTo.Console();

    // Use a dedicated setting — do not bind Serilog:WriteTo:1:Args:serverUrl via env; it creates
    // a partial WriteTo entry (no Name) and crashes startup when appsettings are absent.
    string? seqServerUrl = context.Configuration["Seq:ServerUrl"];
    if (!string.IsNullOrWhiteSpace(seqServerUrl))
    {
        loggerConfiguration.WriteTo.Seq(seqServerUrl);
    }
});

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi("v1", options =>
{
    options.OpenApiVersion = Microsoft.OpenApi.OpenApiSpecVersion.OpenApi3_1;
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        IConfigurationSection jwtSection = builder.Configuration.GetSection("Jwt");
        string issuer = jwtSection["Issuer"] ?? string.Empty;
        string audience = jwtSection["Audience"] ?? string.Empty;
        string publicKeyPem = jwtSection["PublicKeyPem"] ?? string.Empty;

        RsaSecurityKey publicKey = JwtRsaKeyFactory.CreatePublicKey(publicKeyPem);
        // Preserve JWT claim names (tenantSlug, role, …) so policies match TokenValidationParameters.RoleClaimType.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = publicKey,
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            NameClaimType = "userId",
            RoleClaimType = "role"
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                HttpRequest request = context.Request;
                if (request.Query.TryGetValue("access_token", out StringValues token))
                {
                    string? accessToken = token.FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(accessToken) &&
                        request.Path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                }

                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, DocsAnonymousAuthorizationMiddlewareResultHandler>();

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy(AuthorizationPolicies.RequireOwner, policy => policy.RequireRole("Owner"));
    options.AddPolicy(AuthorizationPolicies.RequireAdmin, policy => policy.RequireRole("Admin"));
    options.AddPolicy(AuthorizationPolicies.RequireStaff, policy => policy.RequireRole("Staff"));
    options.AddPolicy(AuthorizationPolicies.RequireAnyStaff, policy => policy.RequireRole("Owner", "Admin", "Staff"));
    options.AddPolicy(AuthorizationPolicies.RequireClientUser, policy => policy.RequireRole("ClientUser"));
    options.AddPolicy(
        AuthorizationPolicies.RequireTenantAccess,
        policy => policy.Requirements.Add(new TenantAccessRequirement()));
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimitPolicies.AuthLogin, context =>
    {
        string partitionKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyNames.Default, policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            string[] developmentOrigins = builder.Configuration
                .GetSection("Cors:DevelopmentOrigins")
                .Get<string[]>()
                ?? [];

            if (developmentOrigins.Length > 0)
            {
                policy.WithOrigins(developmentOrigins);
            }
        }
        else
        {
            string[] tenantAllowedOrigins = builder.Configuration
                .GetSection("Cors:TenantAllowedOrigins")
                .Get<string[]>()
                ?? [];

            if (tenantAllowedOrigins.Length > 0)
            {
                policy.WithOrigins(tenantAllowedOrigins);
            }
        }

        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
    });
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddSignalR();
builder.Services.AddHangfire((serviceProvider, configuration) =>
{
    IConfiguration appConfiguration = serviceProvider.GetRequiredService<IConfiguration>();
    string connectionString = appConfiguration.GetConnectionString("Postgres")
        ?? throw new InvalidOperationException("ConnectionStrings:Postgres must be configured for Hangfire.");

    configuration
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(
            options => options.UseNpgsqlConnection(connectionString),
            new PostgreSqlStorageOptions
            {
                SchemaName = "public"
            });
});
builder.Services.AddHangfireServer();
builder.Services.Configure<RefreshTokenCookieOptions>(options =>
{
    IConfigurationSection section = builder.Configuration.GetSection(RefreshTokenCookieOptions.SectionName);
    options.Name = section["Name"] ?? "refreshToken";
    options.ExpiryDays = int.TryParse(section["ExpiryDays"], out int expiryDays) ? expiryDays : 7;
});
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IRefreshTokenCookieStore, HttpContextRefreshTokenCookieStore>();
builder.Services.AddScoped<ICurrentTenant, HttpCurrentTenant>();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<IRealtimeMessagingService, SignalRRealtimeMessagingService>();
builder.Services.AddSingleton<IConnectionPresenceTracker, ConnectionPresenceTracker>();
builder.Services.AddSingleton<IUserPresenceService, ConnectionPresenceService>();
builder.Services.AddSingleton<IHubFilter, MessagesHubGuardFilter>();
builder.Services.AddScoped<ITenantDomainLookup, PublicRecordTenantDomainLookup>();
builder.Services.AddScoped<ITenantResolver, SlugHeaderTenantResolver>();
builder.Services.AddScoped<ITenantResolver, JwtClaimsTenantResolver>();
builder.Services.AddScoped<ITenantResolver, SubdomainTenantResolver>();
builder.Services.AddScoped<ITenantResolver, CustomDomainTenantResolver>();
builder.Services.AddScoped<ITenantResolver, TenantKeyTenantResolver>();
builder.Services.AddScoped<ITenantResolver, PublicIdHeaderTenantResolver>();
builder.Services.AddScoped<TenantMiddleware>();
builder.Services.AddSingleton<IAuthorizationHandler, TenantAccessAuthorizationHandler>();

var healthChecksBuilder = builder.Services.AddHealthChecks();
string? postgresConnectionString = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrWhiteSpace(postgresConnectionString))
{
    healthChecksBuilder.AddCheck("postgres", () => HealthCheckResult.Unhealthy("ConnectionStrings:Postgres is not configured."));
}
else
{
    healthChecksBuilder.AddNpgSql(postgresConnectionString, name: "postgres");
}

string? redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redisConnectionString))
{
    healthChecksBuilder.AddCheck("redis", () => HealthCheckResult.Unhealthy("ConnectionStrings:Redis is not configured."));
}
else
{
    healthChecksBuilder.AddRedis(redisConnectionString, name: "redis");
}

bool s3HealthCheckEnabled = builder.Configuration.GetValue("HealthChecks:S3:Enabled", false);
if (s3HealthCheckEnabled)
{
    healthChecksBuilder.AddCheck<S3ConnectivityHealthCheck>(
        "s3",
        failureStatus: HealthStatus.Unhealthy);
}

var app = builder.Build();

using (IServiceScope scope = app.Services.CreateScope())
{
    IDbInitializer dbInitializer = scope.ServiceProvider.GetRequiredService<IDbInitializer>();
    ILoggerFactory loggerFactory = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
    Microsoft.Extensions.Logging.ILogger dbInitLogger =
        loggerFactory.CreateLogger("DatabaseInitialization");
    try
    {
        await dbInitializer.InitializeAsync();
    }
    catch (Exception ex) when (app.Environment.IsDevelopment())
    {
        dbInitLogger.LogError(
            ex,
            "Database initialization failed. The API will start (e.g. for OpenAPI) but requests that need the database " +
            "or applied migrations will fail until the connection is valid and pending EF migrations are applied.");
    }
}

// Configure the HTTP request pipeline.
app.UseExceptionHandler();
app.UseSerilogRequestLogging(options =>
{
    options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    options.GetLevel = (httpContext, elapsedMilliseconds, exception) =>
    {
        if (exception is not null || httpContext.Response.StatusCode >= StatusCodes.Status500InternalServerError)
        {
            return LogEventLevel.Error;
        }

        if (elapsedMilliseconds > 500)
        {
            return LogEventLevel.Warning;
        }

        return LogEventLevel.Information;
    };
});
app.UseHttpsRedirection();
app.UseCors(CorsPolicyNames.Default);
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>();
app.UseRateLimiter();
app.UseAuthorization();

app.UseHangfireDashboard(
    "/hangfire",
    new DashboardOptions
    {
        Authorization = [new OwnerDashboardAuthorizationFilter()]
    });
app.MapHealthChecks("/health", new HealthCheckOptions())
    .AllowAnonymous();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi("/openapi/{documentName}.json")
        .AllowAnonymous();
    app.MapScalarApiReference("/scalar/v1", options =>
        {
            options.Title = "ClientPortal API";
            options.OpenApiRoutePattern = "/openapi/{documentName}.json";
            options.DefaultHttpClient = new(ScalarTarget.CSharp, ScalarClient.HttpClient);
        })
        .AllowAnonymous();
}

app.MapAuthEndpoints();
app.MapTenancyEndpoints();
app.MapClientsEndpoints();
app.MapProjectsEndpoints();
app.MapDocumentsEndpoints();
app.MapInvoicesEndpoints();
app.MapFinanceEndpoints();
app.MapPaymentsWebhookEndpoints();
app.MapCommunicationEndpoints();
app.MapNotificationsEndpoints();
app.MapHub<MessagesHub>("/hubs/messages")
    .RequireTenant()
    .RequireAuthorization();
try
{
    RecurringJob.AddOrUpdate<InvoiceReminderJob>(
        "invoice-reminder-job",
        job => job.RunAsync(CancellationToken.None),
        "0 8 * * *",
        new RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Local
        });
    RecurringJob.AddOrUpdate<MarkOverdueInvoicesJob>(
        "mark-overdue-invoices-job",
        job => job.RunAsync(CancellationToken.None),
        "30 0 * * *",
        new RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Local
        });
    RecurringJob.AddOrUpdate<RecurringInvoiceJob>(
        "recurring-invoice-job",
        job => job.RunAsync(CancellationToken.None),
        "15 0 * * *",
        new RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Local
        });
    RecurringJob.AddOrUpdate<MeetingReminderJob>(
        "meeting-reminder-job",
        job => job.RunAsync(CancellationToken.None),
        "0 * * * *",
        new RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Local
        });
    RecurringJob.AddOrUpdate<DocumentExpiryJob>(
        "document-expiry-job",
        job => job.RunAsync(CancellationToken.None),
        "0 6 * * *",
        new RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Local
        });
    RecurringJob.AddOrUpdate<WeeklyDigestJob>(
        "weekly-digest-job",
        job => job.RunAsync(CancellationToken.None),
        "0 7 * * 1",
        new RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Local
        });
    RecurringJob.AddOrUpdate<CurrencyRateRefreshJob>(
        "currency-rate-refresh-job",
        job => job.RunAsync(CancellationToken.None),
        "0 */6 * * *",
        new RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Local
        });
}
catch (Exception) when (app.Environment.IsDevelopment())
{
    // Allow local API startup for documentation when infrastructure dependencies are not available.
}

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return ApiResponse<WeatherForecast[]>.Ok(
        forecast,
        new Dictionary<string, object?>
        {
            ["count"] = forecast.Length
        });
})
.WithName("GetWeatherForecast")
.RequireTenant();

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

internal sealed class BearerSecuritySchemeTransformer(IAuthenticationSchemeProvider authenticationSchemeProvider)
    : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        AuthenticationScheme[] authenticationSchemes = (await authenticationSchemeProvider.GetAllSchemesAsync()).ToArray();
        if (!authenticationSchemes.Any(authScheme => authScheme.Name == JwtBearerDefaults.AuthenticationScheme))
        {
            return;
        }

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
        {
            [JwtBearerDefaults.AuthenticationScheme] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                In = ParameterLocation.Header,
                BearerFormat = "JWT",
                Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'."
            }
        };

        foreach (KeyValuePair<HttpMethod, OpenApiOperation> operation in document.Paths.Values.SelectMany(path => path.Operations ?? []))
        {
            operation.Value.Security ??= [];
            operation.Value.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, document)] = []
            });
        }
    }
}

internal static class CorsPolicyNames
{
    public const string Default = "DefaultCorsPolicy";
}

