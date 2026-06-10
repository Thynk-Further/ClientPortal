using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Meetings.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalMeetingsReader : IClientPortalMeetingsReader
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalMeetingsReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalMeetingsResultDto> GetMeetingsAsync(
        Guid clientId,
        CancellationToken cancellationToken)
    {
        DateTime nowUtc = DateTime.UtcNow;

        List<MeetingListItemDto> meetings = await _tenantDbContext.Set<Meeting>()
            .AsNoTracking()
            .Where(meeting =>
                meeting.ClientId == clientId
                && meeting.ScheduledAt >= nowUtc
                && meeting.Status == MeetingStatus.Scheduled)
            .OrderBy(meeting => meeting.ScheduledAt)
            .Select(meeting => new MeetingListItemDto(
                meeting.Id,
                meeting.ClientId,
                meeting.Title,
                meeting.Description,
                meeting.ScheduledAt,
                meeting.DurationMinutes,
                meeting.MeetingUrl,
                meeting.Status,
                meeting.Attendees))
            .ToListAsync(cancellationToken);

        return new ClientPortalMeetingsResultDto(meetings);
    }
}
