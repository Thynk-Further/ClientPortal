namespace Shared;

public static class RfqNumberComposer
{
    public static string ComposeBase(string businessName, string clientName, DateOnly date)
    {
        string businessInitials = NameInitials.FromName(businessName);
        string clientInitials = NameInitials.FromName(clientName);
        return $"{businessInitials}-{clientInitials}-{date:yyyyMMdd}";
    }

    public static string ComposeWithSequence(string baseNumber, int existingCount)
    {
        if (existingCount <= 0)
        {
            return baseNumber;
        }

        return $"{baseNumber}-{(existingCount + 1):D2}";
    }
}
