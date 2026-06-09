using Application.Projects.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record GetProjectsQuery(
    int Page = 1,
    int PageSize = 20,
    ProjectStatus? Status = null,
    Guid? ClientId = null,
    string? Search = null) : IRequest<Result<PagedResult<ProjectListItemDto>>>;
