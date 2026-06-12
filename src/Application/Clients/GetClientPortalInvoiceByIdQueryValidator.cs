using FluentValidation;

namespace Application.Clients;

public sealed class GetClientPortalInvoiceByIdQueryValidator
    : AbstractValidator<GetClientPortalInvoiceByIdQuery>
{
    public GetClientPortalInvoiceByIdQueryValidator()
    {
        RuleFor(query => query.InvoiceId)
            .NotEmpty();
    }
}
