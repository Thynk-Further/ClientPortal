using Domain;

namespace Application.Meetings.Abstractions;

public interface IMeetingInvitationService
{
    Task SendMeetingRequestAsync(Meeting meeting, CancellationToken cancellationToken = default);

    Task SendCalendarInviteAsync(Meeting meeting, CancellationToken cancellationToken = default);
}
