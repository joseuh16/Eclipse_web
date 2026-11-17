using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class ThemeDto
{
    public int Id { get; set; }
    public string ThemeKey { get; set; } = string.Empty;
    public string PrimaryColor { get; set; } = string.Empty;
    public string SecondaryColor { get; set; } = string.Empty;
    public string AccentColor { get; set; } = string.Empty;
    public string BackgroundColor { get; set; } = string.Empty;
    public string FontStyle { get; set; } = string.Empty;
    public string CustomCss { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ThemeResponseDto
{
    public ThemeDto? Active { get; set; }
    public IReadOnlyList<ThemeDto> Themes { get; set; } = [];
}

public class ThemeUpsertDto
{
    [Required, StringLength(32, MinimumLength = 2)]
    public string ThemeKey { get; set; } = string.Empty;

    [Required, RegularExpression("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", ErrorMessage = "Color hexadecimal inválido.")]
    public string PrimaryColor { get; set; } = string.Empty;

    [Required, RegularExpression("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", ErrorMessage = "Color hexadecimal inválido.")]
    public string SecondaryColor { get; set; } = string.Empty;

    [Required, RegularExpression("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", ErrorMessage = "Color hexadecimal inválido.")]
    public string AccentColor { get; set; } = string.Empty;

    [Required, RegularExpression("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", ErrorMessage = "Color hexadecimal inválido.")]
    public string BackgroundColor { get; set; } = string.Empty;

    [Required, StringLength(64)]
    public string FontStyle { get; set; } = "Sora";

    [StringLength(20000)]
    public string CustomCss { get; set; } = string.Empty;
}
