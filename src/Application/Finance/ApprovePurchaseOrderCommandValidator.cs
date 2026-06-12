using FluentValidation;

namespace Application.Finance;

public sealed class ApprovePurchaseOrderCommandValidator : AbstractValidator<ApprovePurchaseOrderCommand>
{
    public ApprovePurchaseOrderCommandValidator()
    {
        RuleFor(command => command.PurchaseOrderId).NotEmpty();
        RuleFor(command => command.ClientId).NotEmpty();
        RuleFor(command => command.InvoiceNumber).NotEmpty().MaximumLength(64);
        RuleFor(command => command.DueDate).NotEqual(default(DateOnly));
    }
}
