namespace Application.Abstractions;

/// <summary>
/// Marker for MediatR requests that must run without a resolved tenant (e.g. business registration, public login).
/// </summary>
public interface ITenantOptionalRequest;
