namespace Eclipse.Api.Domain.Entities;

public enum ProductCategory
{
    Video,
    IA,
    Edicion,
    Escolar,
    Musica,
    Deportes,
    Lifelong,
    AdultPlus
}

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ProductCategory Category { get; set; }
    public decimal BasePrice { get; set; }
    public int DiscountPercent { get; set; }
    public int DurationMonths { get; set; } = 1;
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsAdultOnly { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
