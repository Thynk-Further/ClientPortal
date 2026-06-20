namespace Domain;

public sealed record StaffInvitedEvent(
    Guid UserId,
    string RecipientEmail,
    string FullName,
    string InviteToken,
    string TenantSlug,
    DateTime InvitedAt) : IDomainEvent;
