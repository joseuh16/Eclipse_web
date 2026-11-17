using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class CouponDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public int DiscountPercent { get; set; }
    public int MaxUses { get; set; }
    public int UsedCount { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsExpired { get; set; }
    public int RemainingUses { get; set; }
}

public class CouponUpsertDto
{
    [Required, StringLength(40, MinimumLength = 3)]
    [RegularExpression("^[A-Za-z0-9_-]+$", ErrorMessage = "El código solo admite letras, números, guiones y guiones bajos.")]
    public string Code { get; set; } = string.Empty;

    [Range(1, 90)]
    public int DiscountPercent { get; set; }

    [Range(1, 100000)]
    public int MaxUses { get; set; } = 100;

    public DateTime? ExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ValidateCouponDto
{
    [Required, StringLength(40)]
    public string Code { get; set; } = string.Empty;
}

public class CouponValidationDto
{
    public bool Valid { get; set; }
    public string Code { get; set; } = string.Empty;
    public int DiscountPercent { get; set; }
    public string Message { get; set; } = string.Empty;
}
