using System.Net.Http.Headers;
using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Messaging.Abstractions;
using Application.Meetings.Abstractions;
using Application.Auth.Abstractions;
using Application.Invoices.Abstractions;
using Infrastructure.Auth;
using Infrastructure.Invoices;
using Infrastructure.Messaging;
using Infrastructure.Meetings;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Public;
using Infrastructure.Persistence.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(options =>
        {
            IConfigurationSection section = configuration.GetSection(JwtOptions.SectionName);
            options.Issuer = section["Issuer"] ?? string.Empty;
            options.Audience = section["Audience"] ?? string.Empty;
            options.PrivateKeyPem = section["PrivateKeyPem"] ?? string.Empty;
            options.PublicKeyPem = section["PublicKeyPem"] ?? string.Empty;
            options.AccessTokenLifetimeMinutes = int.TryParse(section["AccessTokenLifetimeMinutes"], out int minutes) ? minutes : 15;
        });
        services.Configure<RefreshTokenOptions>(options =>
        {
            IConfigurationSection section = configuration.GetSection(RefreshTokenOptions.SectionName);
            options.TokenSizeBytes = int.TryParse(section["TokenSizeBytes"], out int tokenSizeBytes) ? tokenSizeBytes : 32;
            options.LifetimeDays = int.TryParse(section["LifetimeDays"], out int lifetimeDays) ? lifetimeDays : 7;
            options.Iterations = int.TryParse(section["Iterations"], out int iterations) ? iterations : 4;
            options.MemorySizeKb = int.TryParse(section["MemorySizeKb"], out int memorySizeKb) ? memorySizeKb : 65536;
            options.DegreeOfParallelism = int.TryParse(section["DegreeOfParallelism"], out int degreeOfParallelism) ? degreeOfParallelism : 2;
            options.Pepper = section["Pepper"] ?? string.Empty;
        });
        services.Configure<PeachPaymentsOptions>(options =>
        {
            IConfigurationSection section = configuration.GetSection(PeachPaymentsOptions.SectionName);
            options.BaseUrl = section["BaseUrl"] ?? options.BaseUrl;
            options.EntityId = section["EntityId"] ?? string.Empty;
            options.AccessToken = section["AccessToken"] ?? string.Empty;
            options.Currency = section["Currency"] ?? options.Currency;
            options.RequestTimeoutSeconds = int.TryParse(section["RequestTimeoutSeconds"], out int timeoutSeconds)
                ? timeoutSeconds
                : options.RequestTimeoutSeconds;
        });
        services.Configure<StripeOptions>(options =>
        {
            IConfigurationSection section = configuration.GetSection(StripeOptions.SectionName);
            options.BaseUrl = section["BaseUrl"] ?? options.BaseUrl;
            options.SecretKey = section["SecretKey"] ?? string.Empty;
            options.Currency = section["Currency"] ?? options.Currency;
            options.RequestTimeoutSeconds = int.TryParse(section["RequestTimeoutSeconds"], out int timeoutSeconds)
                ? timeoutSeconds
                : options.RequestTimeoutSeconds;
        });
        services.Configure<MessageAttachmentUploadOptions>(configuration.GetSection(MessageAttachmentUploadOptions.SectionName));
        services.AddDbContext<TenantDbContext>();
        services.AddDbContext<PublicDbContext>();
        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        services.AddScoped<IClientRepository, ClientRepository>();
        services.AddScoped<IMessageThreadRepository, MessageThreadRepository>();
        services.AddScoped<IMessageRepository, MessageRepository>();
        services.AddSingleton<IMessageAttachmentUploadUrlService, MessageAttachmentUploadUrlService>();
        services.AddSingleton<IMessageAttachmentMalwareScanService, MessageAttachmentMalwareScanHookService>();
        services.AddScoped<IMessageOfflineFallbackNotifier, NoopMessageOfflineFallbackNotifier>();
        services.AddScoped<INoticeRepository, NoticeRepository>();
        services.AddScoped<IMeetingRepository, MeetingRepository>();
        services.AddScoped<IMeetingInvitationService, NoopMeetingInvitationService>();
        services.AddScoped<IOnboardingChecklistRepository, OnboardingChecklistRepository>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IRefreshTokenService, Argon2RefreshTokenService>();
        services.AddScoped<ITenantDbContextFactory, TenantDbContextFactory>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ITenantProvisioner, TenantProvisioner>();
        services.AddScoped<IDbInitializer, DbInitializer>();
        services.AddScoped<ITenantRlsPolicyManager, TenantRlsPolicyManager>();
        services.AddScoped<IInvoicePdfGenerator, SimpleInvoicePdfGenerator>();
        services.AddSingleton<ICurrencyConverter, CachedCurrencyConverter>();
        services.AddHttpClient<PeachPaymentsGateway>((serviceProvider, client) =>
        {
            PeachPaymentsOptions options = serviceProvider
                .GetRequiredService<Microsoft.Extensions.Options.IOptions<PeachPaymentsOptions>>()
                .Value;

            client.BaseAddress = new Uri(options.BaseUrl, UriKind.Absolute);
            client.Timeout = TimeSpan.FromSeconds(Math.Max(5, options.RequestTimeoutSeconds));

            if (!string.IsNullOrWhiteSpace(options.AccessToken))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.AccessToken);
            }
        });
        services.AddHttpClient<StripeGateway>((serviceProvider, client) =>
        {
            StripeOptions options = serviceProvider
                .GetRequiredService<Microsoft.Extensions.Options.IOptions<StripeOptions>>()
                .Value;

            client.BaseAddress = new Uri(options.BaseUrl, UriKind.Absolute);
            client.Timeout = TimeSpan.FromSeconds(Math.Max(5, options.RequestTimeoutSeconds));

            if (!string.IsNullOrWhiteSpace(options.SecretKey))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.SecretKey);
            }
        });
        services.AddScoped<ManualPaymentGateway>();
        services.AddScoped<NoopPaymentGateway>();
        services.AddScoped<IPaymentGateway, RoutedPaymentGateway>();

        return services;
    }
}
