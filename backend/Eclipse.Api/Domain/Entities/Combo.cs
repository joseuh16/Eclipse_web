namespace Eclipse.Api.Domain.Entities;

/// <summary>
/// A progressive discount tier for the interactive combo builder.
/// Example: 2 profiles => 5%, 3 profiles => 10%, 4+ profiles => 15%.
/// </summary>
public class Combo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int MinProfiles { get; set; }
    public int DiscountPercent { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
