using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record GetNoticeByIdQuery(Guid NoticeId) : IRequest<Result<NoticeListItemDto>>;
