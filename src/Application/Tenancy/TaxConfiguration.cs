using System.Text.Json;
using Domain;

namespace Application.Tenancy;

public sealed class TaxConfiguration
{
    public const decimal DefaultRate = 0.15m;

    public string Label { get; }

    public decimal Rate { get; }

    public string RegistrationNumber { get; }

    public string Notes { get; }

    public string CountryCode { get; }

    public TaxPricingMode PricingMode { get; }

    public TaxConfiguration(
        string label,
        decimal rate,
        string registrationNumber,
        string notes,
        string countryCode,
        TaxPricingMode pricingMode)
    {
        Label = string.IsNullOrWhiteSpace(label) ? "VAT" : label.Trim();
        Rate = NormalizeRate(rate);
        RegistrationNumber = registrationNumber?.Trim() ?? string.Empty;
        Notes = notes?.Trim() ?? string.Empty;
        CountryCode = string.IsNullOrWhiteSpace(countryCode) ? string.Empty : countryCode.Trim().ToUpperInvariant();
        PricingMode = pricingMode;
    }

    public static TaxConfiguration Default()
    {
        return new TaxConfiguration(
            label: "VAT",
            rate: DefaultRate,
            registrationNumber: string.Empty,
            notes: string.Empty,
            countryCode: string.Empty,
            pricingMode: TaxPricingMode.Exclusive);
    }

    public static TaxConfiguration Parse(string? taxConfigJson)
    {
        if (string.IsNullOrWhiteSpace(taxConfigJson) || taxConfigJson.Trim() == "{}")
        {
            return Default();
        }

        try
        {
            TaxConfigurationPayload? payload = JsonSerializer.Deserialize<TaxConfigurationPayload>(
                taxConfigJson,
                JsonOptions);

            if (payload is null)
            {
                return Default();
            }

            decimal rate = payload.Rate ?? payload.DefaultRate ?? payload.VatRate ?? DefaultRate;
            TaxPricingMode pricingMode = ParsePricingMode(payload.PricingMode);

            return new TaxConfiguration(
                payload.Label ?? "VAT",
                rate,
                payload.RegistrationNumber ?? string.Empty,
                payload.Notes ?? string.Empty,
                payload.CountryCode ?? string.Empty,
                pricingMode);
        }
        catch (JsonException)
        {
            return Default();
        }
    }

    public string ToJson()
    {
        TaxConfigurationPayload payload = new()
        {
            Label = Label,
            Rate = Rate,
            RegistrationNumber = string.IsNullOrWhiteSpace(RegistrationNumber) ? null : RegistrationNumber,
            Notes = string.IsNullOrWhiteSpace(Notes) ? null : Notes,
            CountryCode = string.IsNullOrWhiteSpace(CountryCode) ? null : CountryCode,
            PricingMode = PricingMode.ToString().ToLowerInvariant(),
        };

        return JsonSerializer.Serialize(payload, JsonOptions);
    }

    private static TaxPricingMode ParsePricingMode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return TaxPricingMode.Exclusive;
        }

        return value.Trim().Equals("inclusive", StringComparison.OrdinalIgnoreCase)
            ? TaxPricingMode.Inclusive
            : TaxPricingMode.Exclusive;
    }

    private static decimal NormalizeRate(decimal rate)
    {
        if (rate < 0m || rate > 1m)
        {
            return 0m;
        }

        return decimal.Round(rate, 4, MidpointRounding.ToEven);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private sealed class TaxConfigurationPayload
    {
        public string? Label { get; set; }

        public decimal? Rate { get; set; }

        public decimal? DefaultRate { get; set; }

        public decimal? VatRate { get; set; }

        public string? RegistrationNumber { get; set; }

        public string? Notes { get; set; }

        public string? CountryCode { get; set; }

        public string? PricingMode { get; set; }
    }
}
