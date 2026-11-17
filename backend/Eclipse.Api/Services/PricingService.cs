using Eclipse.Api.Domain.Entities;

namespace Eclipse.Api.Services;

public interface IPricingService
{
    decimal GetDurationMultiplier(int months);
    decimal GetUnitPrice(Product product, int months);
    decimal GetComboDiscountPercent(IReadOnlyCollection<Combo> combos, int profiles);
}

public class PricingService : IPricingService
{
    // Longer licenses are prepaid at a discount. These values are shared with the storefront.
    private static readonly Dictionary<int, decimal> Multipliers = new()
    {
        [1] = 1.00m,
        [3] = 2.70m,  // 10% vs 3 individual months
        [6] = 5.10m,  // 15% vs 6 individual months
        [12] = 9.60m  // 20% vs 12 individual months
    };

    public decimal GetDurationMultiplier(int months)
    {
        return Multipliers.TryGetValue(months, out var multiplier) ? multiplier : 1.00m;
    }

    public decimal GetUnitPrice(Product product, int months)
    {
        var listPrice = product.BasePrice * GetDurationMultiplier(months);
        var discounted = listPrice * (1 - product.DiscountPercent / 100m);
        return decimal.Round(discounted, 2, MidpointRounding.AwayFromZero);
    }

    public decimal GetComboDiscountPercent(IReadOnlyCollection<Combo> combos, int profiles)
    {
        return combos
            .Where(c => c.IsActive && c.MinProfiles <= profiles)
            .OrderByDescending(c => c.MinProfiles)
            .Select(c => (decimal)c.DiscountPercent)
            .FirstOrDefault();
    }
}
