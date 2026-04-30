using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record DeleteNoticeCommand(Guid NoticeId) : IRequest<Result>;
