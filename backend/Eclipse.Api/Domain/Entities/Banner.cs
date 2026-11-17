namespace Eclipse.Api.Domain.Entities;

public class Banner
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DiscountText { get; set; } = string.Empty;
    public DateTime? ExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;

    // Storefront presentation fields.
    public string ImageUrl { get; set; } = string.Empty;
    public string CtaText { get; set; } = "Ver ofertas";
    public string CtaUrl { get; set; } = "#catalogo";
    public int SortOrder { get; set; }
}
