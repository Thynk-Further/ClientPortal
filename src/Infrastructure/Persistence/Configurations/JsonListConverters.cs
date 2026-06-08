using System.Text.Json;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Infrastructure.Persistence.Configurations;

internal static class JsonListConverters
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = null,
    };

    public static ValueConverter<List<Guid>, string> GuidListToJsonb { get; } = new(
        v => JsonSerializer.Serialize(v, Options),
        v => JsonSerializer.Deserialize<List<Guid>>(v, Options) ?? new List<Guid>());

    public static ValueConverter<List<string>, string> StringListToJsonb { get; } = new(
        v => JsonSerializer.Serialize(v, Options),
        v => JsonSerializer.Deserialize<List<string>>(v, Options) ?? new List<string>());

    public static ValueConverter<List<Guid>?, string?> NullableGuidListToJsonb { get; } = new(
        v => v == null ? null : JsonSerializer.Serialize(v, Options),
        v => string.IsNullOrEmpty(v) ? null : JsonSerializer.Deserialize<List<Guid>>(v, Options));
}
