using Application.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Persistence;

public sealed class DomainEventDispatcher : IDomainEventDispatcher
{
    private readonly IPublisher _publisher;
    private readonly ILogger<DomainEventDispatcher> _logger;

    public DomainEventDispatcher(IPublisher publisher, ILogger<DomainEventDispatcher> logger)
    {
        _publisher = publisher;
        _logger = logger;
    }

    public async Task DispatchAsync(IDomainEvent domainEvent, CancellationToken cancellationToken = default)
    {
        try
        {
            await _publisher.Publish(domainEvent, cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Failed to dispatch domain event {DomainEventType}.",
                domainEvent.GetType().Name);
        }
    }
}
