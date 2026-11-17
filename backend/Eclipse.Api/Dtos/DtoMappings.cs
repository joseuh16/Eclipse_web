using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Eclipse.Api.Services;

namespace Eclipse.Api.Dtos;

public static class DtoMappings
{
    public static ProductDto ToDto(this Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Category = p.Category,
        BasePrice = p.BasePrice,
        FinalPrice = decimal.Round(p.BasePrice * (1 - p.DiscountPercent / 100m), 2, MidpointRounding.AwayFromZero),
        DiscountPercent = p.DiscountPercent,
        DurationMonths = p.DurationMonths,
        ImageUrl = p.ImageUrl,
        IsActive = p.IsActive,
        IsAdultOnly = p.IsAdultOnly,
        IsFeatured = p.IsFeatured,
        CreatedAt = p.CreatedAt
    };

    public static BannerDto ToDto(this Banner b) => new()
    {
        Id = b.Id,
        Title = b.Title,
        Description = b.Description,
        DiscountText = b.DiscountText,
        ExpiryDate = b.ExpiryDate,
        IsActive = b.IsActive,
        ImageUrl = b.ImageUrl,
        CtaText = b.CtaText,
        CtaUrl = b.CtaUrl,
        SortOrder = b.SortOrder,
        IsExpired = b.ExpiryDate.HasValue && b.ExpiryDate.Value < DateTime.UtcNow
    };

    public static CouponDto ToDto(this Coupon c) => new()
    {
        Id = c.Id,
        Code = c.Code,
        DiscountPercent = c.DiscountPercent,
        MaxUses = c.MaxUses,
        UsedCount = c.UsedCount,
        ExpiryDate = c.ExpiryDate,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt,
        IsExpired = c.ExpiryDate.HasValue && c.ExpiryDate.Value < DateTime.UtcNow,
        RemainingUses = Math.Max(0, c.MaxUses - c.UsedCount)
    };

    public static ThemeDto ToDto(this ThemeConfig t) => new()
    {
        Id = t.Id,
        ThemeKey = t.ThemeKey,
        PrimaryColor = t.PrimaryColor,
        SecondaryColor = t.SecondaryColor,
        AccentColor = t.AccentColor,
        BackgroundColor = t.BackgroundColor,
        FontStyle = t.FontStyle,
        CustomCss = t.CustomCss,
        IsActive = t.IsActive,
        UpdatedAt = t.UpdatedAt
    };

    public static ComboDto ToDto(this Combo c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Description = c.Description,
        MinProfiles = c.MinProfiles,
        DiscountPercent = c.DiscountPercent,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt
    };

    public static PaymentSettingsDto ToDto(this PaymentSettings s) => new()
    {
        Id = s.Id,
        BankName = s.BankName,
        Beneficiary = s.Beneficiary,
        ClabeNumber = s.ClabeNumber,
        MercadoPagoClabe = s.MercadoPagoClabe,
        OxxoReference = s.OxxoReference,
        WhatsAppNumber = s.WhatsAppNumber,
        SupportEmail = s.SupportEmail,
        PaymentNote = s.PaymentNote,
        UpdatedAt = s.UpdatedAt
    };

    public static OrderDto ToDto(this Order order) => new()
    {
        Id = order.Id,
        OrderNumber = order.OrderNumber,
        CustomerName = order.CustomerName,
        CustomerEmail = order.CustomerEmail,
        CustomerPhone = order.CustomerPhone,
        Subtotal = order.Subtotal,
        DiscountAmount = order.DiscountAmount,
        TotalAmount = order.TotalAmount,
        PaymentMethod = order.PaymentMethod,
        Status = order.Status,
        CouponCode = order.CouponCode,
        Notes = order.Notes,
        Items = OrderItemsCodec.Deserialize(order.ItemsJson),
        CreatedAt = order.CreatedAt,
        VerifiedAt = order.VerifiedAt
    };
}
