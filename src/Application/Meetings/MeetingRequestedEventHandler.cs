using Application.Meetings.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Meetings;

public sealed class MeetingRequestedEventHandler : INotificationHandler<MeetingRequestedEvent>
{
    private readonly IMeetingRepository _meetingRepository;
    private readonly IMeetingInvitationService _meetingInvitationService;
    private readonly ILogger<MeetingRequestedEventHandler> _logger;

    public MeetingRequestedEventHandler(
        IMeetingRepository meetingRepository,
        IMeetingInvitationService meetingInvitationService,
        ILogger<MeetingRequestedEventHandler> logger)
    {
        _meetingRepository = meetingRepository;
        _meetingInvitationService = meetingInvitationService;
        _logger = logger;
    }

    public async Task Handle(MeetingRequestedEvent notification, CancellationToken cancellationToken)
    {
        Meeting? meeting = await _meetingRepository.FindByIdAsync(notification.MeetingId, cancellationToken);
        if (meeting is null || meeting.ClientId != notification.ClientId)
        {
            _logger.LogWarning(
                "MeetingRequestedEvent ignored because meeting {MeetingId} was not found for client {ClientId}.",
                notification.MeetingId,
                notification.ClientId);
            return;
        }

        try
        {
            await _meetingInvitationService.SendMeetingRequestAsync(meeting, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send meeting request notification for meeting {MeetingId}.", meeting.Id);
        }
    }
}
