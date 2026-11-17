using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/theme")]
public class ThemeController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ThemeResponseDto>> GetTheme()
    {
        var themes = await db.ThemeConfigs.AsNoTracking().OrderBy(t => t.Id).ToListAsync();
        var active = themes.FirstOrDefault(t => t.IsActive) ?? themes.FirstOrDefault();

        return Ok(new ThemeResponseDto
        {
            Active = active?.ToDto(),
            Themes = themes.Select(t => t.ToDto()).ToList()
        });
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ThemeResponseDto>> SaveTheme(ThemeUpsertDto dto)
    {
        var key = dto.ThemeKey.Trim().ToLowerInvariant();
        if (key.Length > 32)
        {
            return BadRequest(new { message = "La clave del tema no puede superar 32 caracteres." });
        }

        var theme = await db.ThemeConfigs.FirstOrDefaultAsync(t => t.ThemeKey == key);
        if (theme is null)
        {
            theme = new ThemeConfig { ThemeKey = key };
            db.ThemeConfigs.Add(theme);
        }

        theme.PrimaryColor = dto.PrimaryColor;
        theme.SecondaryColor = dto.SecondaryColor;
        theme.AccentColor = dto.AccentColor;
        theme.BackgroundColor = dto.BackgroundColor;
        theme.FontStyle = dto.FontStyle.Trim();
        theme.CustomCss = dto.CustomCss?.Trim() ?? string.Empty;
        theme.UpdatedAt = DateTime.UtcNow;

        var allThemes = await db.ThemeConfigs.ToListAsync();
        foreach (var item in allThemes)
        {
            item.IsActive = item.Id == theme.Id;
        }
        theme.IsActive = true;

        await db.SaveChangesAsync();
        return Ok(await BuildResponseAsync());
    }

    [HttpPut("{themeKey}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ThemeResponseDto>> ActivateTheme(string themeKey)
    {
        var key = themeKey.Trim().ToLowerInvariant();
        var themes = await db.ThemeConfigs.ToListAsync();
        var theme = themes.FirstOrDefault(t => t.ThemeKey == key);
        if (theme is null)
        {
            return NotFound(new { message = "Tema no encontrado." });
        }

        foreach (var item in themes)
        {
            item.IsActive = item.Id == theme.Id;
        }

        theme.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(await BuildResponseAsync());
    }

    private async Task<ThemeResponseDto> BuildResponseAsync()
    {
        var themes = await db.ThemeConfigs.AsNoTracking().OrderBy(t => t.Id).ToListAsync();
        return new ThemeResponseDto
        {
            Active = themes.FirstOrDefault(t => t.IsActive)?.ToDto(),
            Themes = themes.Select(t => t.ToDto()).ToList()
        };
    }
}
