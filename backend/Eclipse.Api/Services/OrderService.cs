using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Eclipse.Api.Services;

public class OrderService(AppDbContext db, IPricingService pricing, ILogger<OrderService> logger)
{
    private static readonly HashSet<int> AllowedDurations = [1, 3, 6, 12];
    private static readonly CultureInfo MxCulture = CultureInfo.GetCultureInfo("es-MX");

    public async Task<OrderConfirmationDto> CreateAsync(CreateOrderDto dto)
    {
        if (dto.Items.Count == 0)
        {
            throw new ApiException(400, "El carrito está vacío.");
        }

        if (dto.Items.Count > 20)
        {
            throw new ApiException(400, "El pedido supera el máximo de 20 líneas.");
        }

        foreach (var item in dto.Items)
        {
            if (!AllowedDurations.Contains(item.DurationMonths))
            {
                throw new ApiException(400, "La duración debe ser de 1, 3, 6 o 12 meses.");
            }

            if (item.Quantity is < 1 or > 10)
            {
                throw new ApiException(400, "La cantidad por producto debe estar entre 1 y 10.");
            }

            var isCombo = item.ProductIds is { Count: >= 2 };
            if (!isCombo && item.ProductId is null)
            {
                throw new ApiException(400, "Cada línea debe incluir un producto o un combo de al menos 2 perfiles.");
            }
        }

        var allIds = dto.Items
            .SelectMany(i =>
            {
                if (i.ProductIds is { Count: >= 2 })
                {
                    return (IEnumerable<int>)i.ProductIds;
                }

                return i.ProductId.HasValue ? new[] { i.ProductId.Value } : Array.Empty<int>();
            })
            .Distinct()
            .ToList();

        var products = await db.Products
            .AsNoTracking()
            .Where(p => allIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        if (products.Count != allIds.Count)
        {
            throw new ApiException(400, "Uno o más productos ya no están disponibles.");
        }

        if (products.Values.Any(p => !p.IsActive))
        {
            throw new ApiException(400, "Uno o más productos están desactivados temporalmente.");
        }

        var hasAdultProducts = products.Values.Any(p => p.IsAdultOnly);
        if (hasAdultProducts && !dto.AdultConsent)
        {
            throw new ApiException(403, "Debes confirmar que eres mayor de edad para comprar contenido +18.");
        }

        var combos = await db.Combos.AsNoTracking().Where(c => c.IsActive).ToListAsync();
        var snapshots = new List<OrderItemSnapshotDto>();

        foreach (var item in dto.Items)
        {
            var quantity = item.Quantity;
            var duration = item.DurationMonths;

            if (item.ProductIds is { Count: >= 2 })
            {
                var comboIds = item.ProductIds.Distinct().ToList();
                if (comboIds.Count < 2)
                {
                    throw new ApiException(400, "Un combo necesita al menos 2 perfiles distintos.");
                }

                if (comboIds.Any(id => !products.ContainsKey(id)))
                {
                    throw new ApiException(400, "Uno de los perfiles del combo no está disponible.");
                }

                var comboProducts = comboIds.Select(id => products[id]).ToList();
                var originalUnitPrice = comboProducts.Sum(p => pricing.GetUnitPrice(p, duration));
                var comboDiscount = pricing.GetComboDiscountPercent(combos, comboProducts.Count);
                var discountedUnitPrice = decimal.Round(originalUnitPrice * (1 - comboDiscount / 100m), 2, MidpointRounding.AwayFromZero);
                var lineTotal = decimal.Round(discountedUnitPrice * quantity, 2, MidpointRounding.AwayFromZero);

                snapshots.Add(new OrderItemSnapshotDto
                {
                    Name = "Combo Eclipse: " + string.Join(" + ", comboProducts.Select(p => p.Name)),
                    Category = "Combo",
                    ProductIds = comboIds,
                    DurationMonths = duration,
                    Quantity = quantity,
                    OriginalUnitPrice = originalUnitPrice,
                    UnitPrice = discountedUnitPrice,
                    LineTotal = lineTotal,
                    ComboDiscountPercent = comboDiscount,
                    ImageUrl = comboProducts.FirstOrDefault()?.ImageUrl ?? string.Empty,
                    IsAdultOnly = comboProducts.Any(p => p.IsAdultOnly)
                });

                continue;
            }

            var product = products[item.ProductId!.Value];
            var unitPrice = pricing.GetUnitPrice(product, duration);
            var singleLineTotal = decimal.Round(unitPrice * quantity, 2, MidpointRounding.AwayFromZero);

            snapshots.Add(new OrderItemSnapshotDto
            {
                Name = product.Name,
                Category = product.Category.ToString(),
                ProductId = product.Id,
                DurationMonths = duration,
                Quantity = quantity,
                OriginalUnitPrice = unitPrice,
                UnitPrice = unitPrice,
                LineTotal = singleLineTotal,
                ComboDiscountPercent = 0,
                ImageUrl = product.ImageUrl,
                IsAdultOnly = product.IsAdultOnly
            });
        }

        var subtotal = decimal.Round(snapshots.Sum(s => s.LineTotal), 2, MidpointRounding.AwayFromZero);

        Coupon? coupon = null;
        var couponCode = dto.CouponCode?.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(couponCode))
        {
            coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == couponCode);
            var couponError = ValidateCoupon(coupon);
            if (couponError is not null)
            {
                throw new ApiException(400, couponError);
            }
        }

        var discountAmount = coupon is null
            ? 0m
            : decimal.Round(subtotal * coupon.DiscountPercent / 100m, 2, MidpointRounding.AwayFromZero);
        var total = Math.Max(0m, decimal.Round(subtotal - discountAmount, 2, MidpointRounding.AwayFromZero));

        var order = new Order
        {
            OrderNumber = await GenerateOrderNumberAsync(),
            CustomerName = dto.CustomerName.Trim(),
            CustomerEmail = string.IsNullOrWhiteSpace(dto.CustomerEmail) ? null : dto.CustomerEmail.Trim(),
            CustomerPhone = string.IsNullOrWhiteSpace(dto.CustomerPhone) ? null : dto.CustomerPhone.Trim(),
            Subtotal = subtotal,
            DiscountAmount = discountAmount,
            TotalAmount = total,
            PaymentMethod = dto.PaymentMethod,
            Status = OrderStatus.Pending,
            CouponCode = coupon?.Code,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            ItemsJson = OrderItemsCodec.Serialize(snapshots),
            CreatedAt = DateTime.UtcNow
        };

        db.Orders.Add(order);

        if (coupon is not null)
        {
            coupon.UsedCount++;
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Orden {OrderNumber} creada por {Total} ({Method})", order.OrderNumber, total, order.PaymentMethod);

        var settings = await db.PaymentSettings.AsNoTracking().FirstOrDefaultAsync()
            ?? new PaymentSettings { WhatsAppNumber = "5215512345678", SupportEmail = "soporte@techyuc.com", BankName = "BBVA México" };

        return new OrderConfirmationDto
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerName = order.CustomerName,
            Subtotal = order.Subtotal,
            DiscountAmount = order.DiscountAmount,
            TotalAmount = order.TotalAmount,
            PaymentMethod = order.PaymentMethod,
            Items = snapshots,
            Settings = settings.ToDto(),
            WhatsAppUrl = BuildWhatsAppUrl(settings, order, snapshots),
            CreatedAt = order.CreatedAt
        };
    }

    public static string? ValidateCoupon(Coupon? coupon)
    {
        if (coupon is null)
        {
            return "El cupón no existe.";
        }

        if (!coupon.IsActive)
        {
            return "El cupón está desactivado.";
        }

        if (coupon.ExpiryDate.HasValue && coupon.ExpiryDate.Value < DateTime.UtcNow)
        {
            return "El cupón ya expiró.";
        }

        if (coupon.MaxUses > 0 && coupon.UsedCount >= coupon.MaxUses)
        {
            return "El cupón alcanzó su límite de usos.";
        }

        return null;
    }

    private async Task<string> GenerateOrderNumberAsync()
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var candidate = $"ECL-{DateTime.UtcNow:yyMMdd}-{RandomNumberGenerator.GetInt32(0, 10000):D4}";
            if (!await db.Orders.AnyAsync(o => o.OrderNumber == candidate))
            {
                return candidate;
            }
        }

        return $"ECL-{DateTime.UtcNow:yyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant();
    }

    public static string BuildWhatsAppUrl(PaymentSettings settings, Order order, IReadOnlyList<OrderItemSnapshotDto> items)
    {
        var digits = new string((settings.WhatsAppNumber ?? string.Empty).Where(char.IsDigit).ToArray());
        if (digits.Length == 10)
        {
            digits = "52" + digits;
        }

        var sb = new StringBuilder();
        sb.AppendLine($"Hola Eclipse Tech, quiero confirmar mi pedido *{order.OrderNumber}*.");
        sb.AppendLine();
        sb.AppendLine($"Cliente: {order.CustomerName}");
        sb.AppendLine($"Método de pago: {order.PaymentMethod}");
        sb.AppendLine();
        sb.AppendLine("*Productos*");
        foreach (var item in items)
        {
            sb.AppendLine($"• {item.Quantity}x {item.Name} ({item.DurationMonths} {(item.DurationMonths == 1 ? "mes" : "meses")}) — {item.LineTotal.ToString("C", MxCulture)}");
        }

        sb.AppendLine();
        sb.AppendLine($"Subtotal: {order.Subtotal.ToString("C", MxCulture)}");
        if (order.DiscountAmount > 0)
        {
            sb.AppendLine($"Cupón {order.CouponCode}: -{order.DiscountAmount.ToString("C", MxCulture)}");
        }

        sb.AppendLine($"*Total: {order.TotalAmount.ToString("C", MxCulture)}*");
        sb.AppendLine();
        sb.AppendLine("Adjunto mi comprobante de pago. ¡Gracias!");

        return $"https://wa.me/{digits}?text={Uri.EscapeDataString(sb.ToString())}";
    }
}
