using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class BannerDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DiscountText { get; set; } = string.Empty;
    public DateTime? ExpiryDate { get; set; }
    public bool IsActive { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string CtaText { get; set; } = string.Empty;
    public string CtaUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsExpired { get; set; }
}

public class BannerUpsertDto
{
    [Required, StringLength(160, MinimumLength = 3)]
    public string Title { get; set; } = string.Empty;

    [StringLength(600)]
    public string Description { get; set; } = string.Empty;

    [StringLength(80)]
    public string DiscountText { get; set; } = string.Empty;

    public DateTime? ExpiryDate { get; set; }

    public bool IsActive { get; set; } = true;

    [StringLength(1000)]
    public string ImageUrl { get; set; } = string.Empty;

    [StringLength(60)]
    public string CtaText { get; set; } = "Ver ofertas";

    [StringLength(300)]
    public string CtaUrl { get; set; } = "#catalogo";

    public int SortOrder { get; set; }
}
