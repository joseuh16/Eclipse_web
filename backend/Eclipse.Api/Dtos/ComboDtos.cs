using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class ComboDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int MinProfiles { get; set; }
    public int DiscountPercent { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ComboUpsertDto
{
    [Required, StringLength(120, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [StringLength(400)]
    public string Description { get; set; } = string.Empty;

    [Range(2, 10)]
    public int MinProfiles { get; set; } = 2;

    [Range(1, 90)]
    public int DiscountPercent { get; set; } = 5;

    public bool IsActive { get; set; } = true;
}
