using Application;
using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Messaging.Abstractions;
using Api.Auth;
using Api.Clients;
using Api.Communication;
using Api.Contracts;
using Api.Documents;
using Api.HealthChecks;
using Api.Invoices;
using Api.Middleware;
using Api.Notifications;
using Api.Projects;
using Api.Tenancy;
using Infrastructure;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
using System.Security.Cryptography;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "ClientPortal.Api");
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

        RsaSecurityKey publicKey = JwtKeyUtilities.CreatePublicKey(publicKeyPem);
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
    });
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
builder.Services.AddScoped<IRealtimeMessagingService, SignalRRealtimeMessagingService>();
builder.Services.AddSingleton<IConnectionPresenceTracker, ConnectionPresenceTracker>();
builder.Services.AddSingleton<IUserPresenceService, ConnectionPresenceService>();
builder.Services.AddSingleton<IHubFilter, MessagesHubGuardFilter>();
builder.Services.AddScoped<ITenantDomainLookup, NullTenantDomainLookup>();
builder.Services.AddScoped<ITenantResolver, SubdomainTenantResolver>();
builder.Services.AddScoped<ITenantResolver, CustomDomainTenantResolver>();
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

healthChecksBuilder.AddCheck<S3ConnectivityHealthCheck>("s3", failureStatus: HealthStatus.Unhealthy);

var app = builder.Build();

using (IServiceScope scope = app.Services.CreateScope())
{
    IDbInitializer dbInitializer = scope.ServiceProvider.GetRequiredService<IDbInitializer>();
    await dbInitializer.InitializeAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi("/openapi/{documentName}.json");
    app.MapScalarApiReference("/scalar/v1", options =>
    {
        options.Title = "ClientPortal API";
        options.OpenApiRoutePattern = "/openapi/{documentName}.json";
        options.DefaultHttpClient = new(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

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
app.UseMiddleware<TenantMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health", new HealthCheckOptions());
app.MapAuthEndpoints();
app.MapClientsEndpoints();
app.MapProjectsEndpoints();
app.MapDocumentsEndpoints();
app.MapInvoicesEndpoints();
app.MapPaymentsWebhookEndpoints();
app.MapCommunicationEndpoints();
app.MapNotificationsEndpoints();
app.MapHub<MessagesHub>("/hubs/messages")
    .RequireTenant()
    .RequireAuthorization();

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

internal static class JwtKeyUtilities
{
    public static RsaSecurityKey CreatePublicKey(string publicKeyPem)
    {
        if (string.IsNullOrWhiteSpace(publicKeyPem))
        {
            throw new InvalidOperationException("Jwt:PublicKeyPem must be configured.");
        }

        string normalizedPem = publicKeyPem.Replace("\\n", "\n").Trim();
        RSA rsa = RSA.Create();
        rsa.ImportFromPem(normalizedPem);
        return new RsaSecurityKey(rsa);
    }
}
