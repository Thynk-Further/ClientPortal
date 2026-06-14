using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Meetings.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class AcceptClientPortalMeetingCommandHandler
    : IRequestHandler<AcceptClientPortalMeetingCommand, Result>
{
    private static readonly Error MeetingNotFoundError = new("Meetings.NotFound", "Meeting was not found.", ErrorType.NotFound);
    private static readonly Error MeetingInvalidStateError = new("Meetings.InvalidState", "Meeting cannot be accepted in its current state.", ErrorType.Conflict);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IMeetingRepository _meetingRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AcceptClientPortalMeetingCommandHandler(
        ICurrentClientResolver currentClientResolver,
        IMeetingRepository meetingRepository,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _meetingRepository = meetingRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(AcceptClientPortalMeetingCommand request, CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result.Failure(clientIdResult.Errors);
        }

        Meeting? meeting = await _meetingRepository.FindByIdAsync(request.MeetingId, cancellationToken);
        if (meeting is null || meeting.ClientId != clientIdResult.Value)
        {
            return Result.Failure(MeetingNotFoundError);
        }

        try
        {
            meeting.Accept();
            meeting.RaiseScheduledEvent(DateTime.UtcNow);
        }
        catch (InvalidOperationException)
        {
            return Result.Failure(MeetingInvalidStateError);
        }

        _meetingRepository.Update(meeting);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
