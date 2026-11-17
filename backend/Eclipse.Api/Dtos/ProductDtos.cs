using Eclipse.Api.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class ProductQueryDto
{
    public ProductCategory? Category { get; set; }
    public string? Search { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }

    /// <summary>newest | price_asc | price_desc | name | discount</summary>
    public string? Sort { get; set; }

    public bool? Featured { get; set; }
    public bool IncludeAdult { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ProductCategory Category { get; set; }
    public decimal BasePrice { get; set; }
    public decimal FinalPrice { get; set; }
    public int DiscountPercent { get; set; }
    public int DurationMonths { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsAdultOnly { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductUpsertDto
{
    [Required, StringLength(160, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public ProductCategory Category { get; set; }

    [Range(1, 100000, ErrorMessage = "El precio debe ser mayor a 0.")]
    public decimal BasePrice { get; set; }

    [Range(0, 90)]
    public int DiscountPercent { get; set; }

    [Range(1, 12)]
    public int DurationMonths { get; set; } = 1;

    [StringLength(1000)]
    public string ImageUrl { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public bool IsAdultOnly { get; set; }
    public bool IsFeatured { get; set; }
}
