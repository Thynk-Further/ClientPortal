using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Domain;
using Shared;

namespace Infrastructure.Finance;

public sealed class RfqNumberGenerator : IRfqNumberGenerator
{
    private static readonly Error TenantNotResolvedError = new(
        "Tenant.Unresolved",
        "Tenant could not be resolved for RFQ number generation.",
        ErrorType.NotFound);

    private static readonly Error ClientNotFoundError = new(
        "Clients.NotFound",
        "Client was not found.",
        ErrorType.NotFound);

    private readonly ICurrentTenant _currentTenant;
    private readonly ITenantPublicRecordLookup _tenantPublicRecordLookup;
    private readonly IClientRepository _clientRepository;
    private readonly IRfqRepository _rfqRepository;

    public RfqNumberGenerator(
        ICurrentTenant currentTenant,
        ITenantPublicRecordLookup tenantPublicRecordLookup,
        IClientRepository clientRepository,
        IRfqRepository rfqRepository)
    {
        _currentTenant = currentTenant;
        _tenantPublicRecordLookup = tenantPublicRecordLookup;
        _clientRepository = clientRepository;
        _rfqRepository = rfqRepository;
    }

    public async Task<Result<string>> GenerateAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<string>.Failure(TenantNotResolvedError);
        }

        TenantPublicRecord? tenant = await _tenantPublicRecordLookup.FindBySlugAsync(
            _currentTenant.Slug,
            cancellationToken);

        if (tenant is null || !tenant.IsActive)
        {
            return Result<string>.Failure(TenantNotResolvedError);
        }

        Client? client = await _clientRepository.FindByIdAsync(clientId, cancellationToken);
        if (client is null)
        {
            return Result<string>.Failure(ClientNotFoundError);
        }

        string baseNumber = RfqNumberComposer.ComposeBase(
            tenant.Name,
            client.CompanyName,
            DateOnly.FromDateTime(DateTime.UtcNow));

        int existingCount = await _rfqRepository.CountByRfqNumberPrefixAsync(baseNumber, cancellationToken);
        string rfqNumber = RfqNumberComposer.ComposeWithSequence(baseNumber, existingCount);

        return Result<string>.Success(rfqNumber);
    }
}
