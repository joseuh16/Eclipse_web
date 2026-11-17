using Eclipse.Api.Dtos;
using System.Text.Json;

namespace Eclipse.Api.Services;

public static class OrderItemsCodec
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static string Serialize(IEnumerable<OrderItemSnapshotDto> items) =>
        JsonSerializer.Serialize(items, Options);

    public static List<OrderItemSnapshotDto> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<OrderItemSnapshotDto>>(json, Options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
