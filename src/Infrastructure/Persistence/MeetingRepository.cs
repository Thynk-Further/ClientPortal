using Application.Meetings.Abstractions;
using Application.Meetings.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class MeetingRepository : IMeetingRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public MeetingRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<Meeting?> FindByIdAsync(Guid meetingId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<Meeting>()
            .SingleOrDefaultAsync(meeting => meeting.Id == meetingId, cancellationToken);
    }

    public async Task<PagedResult<MeetingListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        Guid? clientId,
        DateTime? scheduledFrom,
        DateTime? scheduledTo,
        MeetingStatus? status,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Meeting> query = _tenantDbContext.Set<Meeting>().AsNoTracking();

        if (clientId.HasValue)
        {
            query = query.Where(meeting => meeting.ClientId == clientId.Value);
        }

        if (scheduledFrom.HasValue)
        {
            DateTime normalizedFrom = scheduledFrom.Value.ToUniversalTime();
            query = query.Where(meeting => meeting.ScheduledAt >= normalizedFrom);
        }

        if (scheduledTo.HasValue)
        {
            DateTime normalizedTo = scheduledTo.Value.ToUniversalTime();
            query = query.Where(meeting => meeting.ScheduledAt <= normalizedTo);
        }

        if (status.HasValue)
        {
            query = query.Where(meeting => meeting.Status == status.Value);
        }

        int totalCount = await query.CountAsync(cancellationToken);

        IReadOnlyList<MeetingListItemDto> items = await query
            .OrderBy(meeting => meeting.ScheduledAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(meeting => new MeetingListItemDto(
                meeting.Id,
                meeting.ClientId,
                meeting.Title,
                meeting.Description,
                meeting.ScheduledAt,
                meeting.ScheduledTimeZoneId,
                meeting.DurationMinutes,
                meeting.MeetingUrl,
                meeting.Status,
                meeting.Attendees))
            .ToListAsync(cancellationToken);

        return new PagedResult<MeetingListItemDto>(items, totalCount, page, pageSize);
    }

    public void Add(Meeting meeting)
    {
        _tenantDbContext.Set<Meeting>().Add(meeting);
    }

    public void Update(Meeting meeting)
    {
        _tenantDbContext.Set<Meeting>().Update(meeting);
    }
}
