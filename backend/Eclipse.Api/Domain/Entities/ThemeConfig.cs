namespace Eclipse.Api.Domain.Entities;

public class ThemeConfig
{
    public int Id { get; set; }

    /// <summary>base | autumn | halloween | christmas | reyes</summary>
    public string ThemeKey { get; set; } = "base";

    public string PrimaryColor { get; set; } = "#7C3AED";
    public string SecondaryColor { get; set; } = "#06B6D4";
    public string AccentColor { get; set; } = "#F59E0B";
    public string BackgroundColor { get; set; } = "#06060B";
    public string FontStyle { get; set; } = "Sora";
    public string CustomCss { get; set; } = string.Empty;

    // Extra flag used to resolve the currently published theme.
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
