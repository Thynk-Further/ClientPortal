using FluentValidation;

namespace Application.Tenancy;

public sealed class GetTenantLogoUploadUrlCommandValidator : AbstractValidator<GetTenantLogoUploadUrlCommand>
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".svg",
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/svg+xml",
    };

    public GetTenantLogoUploadUrlCommandValidator()
    {
        RuleFor(command => command.FileName)
            .NotEmpty()
            .Must(fileName => AllowedExtensions.Contains(Path.GetExtension(fileName)))
            .WithMessage("Logo file must be PNG, JPG, JPEG, or SVG.");

        RuleFor(command => command.ContentType)
            .NotEmpty()
            .Must(contentType => AllowedContentTypes.Contains(contentType))
            .WithMessage("Logo content type is not supported.");
    }
}
