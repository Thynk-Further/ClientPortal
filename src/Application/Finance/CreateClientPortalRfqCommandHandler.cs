using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class CreateClientPortalRfqCommandHandler
    : IRequestHandler<CreateClientPortalRfqCommand, Result<RfqDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IRfqRepository _rfqRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateClientPortalRfqCommandHandler(
        ICurrentClientResolver currentClientResolver,
        IRfqRepository rfqRepository,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _rfqRepository = rfqRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<RfqDto>> Handle(CreateClientPortalRfqCommand request, CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<RfqDto>.Failure(clientIdResult.Errors);
        }

        Rfq rfq = Rfq.Create(
            Guid.CreateVersion7(),
            clientIdResult.Value,
            request.ProjectId,
            request.RfqNumber,
            request.LineItems.Select(item => new RfqLineItem(item.Description, item.Quantity)),
            request.Currency,
            request.Notes);

        _rfqRepository.Add(rfq);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<RfqDto>.Success(FinanceMapping.Map(rfq));
    }
}
