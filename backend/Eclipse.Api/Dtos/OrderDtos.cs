using Eclipse.Api.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class CreateOrderDto
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string CustomerName { get; set; } = string.Empty;

    [EmailAddress, StringLength(160)]
    public string? CustomerEmail { get; set; }

    [Phone, StringLength(30)]
    public string? CustomerPhone { get; set; }

    [Required]
    public PaymentMethod PaymentMethod { get; set; }

    [StringLength(40)]
    public string? CouponCode { get; set; }

    public bool AdultConsent { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    [Required, MinLength(1, ErrorMessage = "El carrito está vacío.")]
    public List<CreateOrderItemDto> Items { get; set; } = [];
}

public class CreateOrderItemDto
{
    public int? ProductId { get; set; }

    /// <summary>When 2+ ids are sent, the line is priced as an interactive combo.</summary>
    public List<int>? ProductIds { get; set; }

    public int DurationMonths { get; set; } = 1;
    public int Quantity { get; set; } = 1;
}

public class OrderItemSnapshotDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int? ProductId { get; set; }
    public List<int>? ProductIds { get; set; }
    public int DurationMonths { get; set; }
    public int Quantity { get; set; }
    public decimal OriginalUnitPrice { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public decimal ComboDiscountPercent { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsAdultOnly { get; set; }
}

public class OrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public OrderStatus Status { get; set; }
    public string? CouponCode { get; set; }
    public string? Notes { get; set; }
    public List<OrderItemSnapshotDto> Items { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

public class OrderStatusUpdateDto
{
    [Required]
    public OrderStatus Status { get; set; }
}

public class OrderConfirmationDto
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public List<OrderItemSnapshotDto> Items { get; set; } = [];
    public PaymentSettingsDto Settings { get; set; } = new();
    public string WhatsAppUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
