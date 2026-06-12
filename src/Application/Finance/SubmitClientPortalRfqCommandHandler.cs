using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class SubmitClientPortalRfqCommandHandler : IRequestHandler<SubmitClientPortalRfqCommand, Result>
{
    private static readonly Error RfqNotFoundError = new("Rfqs.NotFound", "RFQ was not found.", ErrorType.NotFound);
    private static readonly Error RfqInvalidStateError = new("Rfqs.InvalidState", "RFQ cannot be submitted in its current state.", ErrorType.Conflict);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IRfqRepository _rfqRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SubmitClientPortalRfqCommandHandler(
        ICurrentClientResolver currentClientResolver,
        IRfqRepository rfqRepository,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _rfqRepository = rfqRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(SubmitClientPortalRfqCommand request, CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result.Failure(clientIdResult.Errors);
        }

        Rfq? rfq = await _rfqRepository.FindByIdAsync(request.RfqId, cancellationToken);
        if (rfq is null || rfq.ClientId != clientIdResult.Value)
        {
            return Result.Failure(RfqNotFoundError);
        }

        try
        {
            rfq.Submit();
        }
        catch (InvalidOperationException)
        {
            return Result.Failure(RfqInvalidStateError);
        }

        _rfqRepository.Update(rfq);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
