using MediatR;
using Shared;

namespace Application.Clients;

public sealed record MarkClientPortalNoticeReadCommand(Guid NoticeId) : IRequest<Result>;
