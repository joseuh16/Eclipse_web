using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/banners")]
public class BannersController(AppDbContext db) : ControllerBase
{
    [HttpGet("active")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<BannerDto>>> GetActive()
    {
        var now = DateTime.UtcNow;
        var banners = await db.Banners.AsNoTracking()
            .Where(b => b.IsActive && (b.ExpiryDate == null || b.ExpiryDate >= now))
            .OrderBy(b => b.SortOrder)
            .ThenBy(b => b.Id)
            .ToListAsync();

        return Ok(banners.Select(b => b.ToDto()).ToList());
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<BannerDto>>> GetAll()
    {
        var banners = await db.Banners.AsNoTracking()
            .OrderBy(b => b.SortOrder)
            .ThenByDescending(b => b.Id)
            .ToListAsync();

        return Ok(banners.Select(b => b.ToDto()).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<BannerDto>> Create(BannerUpsertDto dto)
    {
        var banner = new Banner { Title = dto.Title.Trim() };
        Apply(banner, dto);
        db.Banners.Add(banner);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = banner.Id }, banner.ToDto());
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<BannerDto>> Update(int id, BannerUpsertDto dto)
    {
        var banner = await db.Banners.FindAsync(id);
        if (banner is null)
        {
            return NotFound(new { message = "Banner no encontrado." });
        }

        banner.Title = dto.Title.Trim();
        Apply(banner, dto);
        await db.SaveChangesAsync();
        return Ok(banner.ToDto());
    }

    [HttpPatch("{id:int}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<BannerDto>> Toggle(int id)
    {
        var banner = await db.Banners.FindAsync(id);
        if (banner is null)
        {
            return NotFound(new { message = "Banner no encontrado." });
        }

        banner.IsActive = !banner.IsActive;
        await db.SaveChangesAsync();
        return Ok(banner.ToDto());
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var banner = await db.Banners.FindAsync(id);
        if (banner is null)
        {
            return NotFound(new { message = "Banner no encontrado." });
        }

        db.Banners.Remove(banner);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(Banner banner, BannerUpsertDto dto)
    {
        banner.Description = dto.Description.Trim();
        banner.DiscountText = dto.DiscountText.Trim();
        banner.ExpiryDate = dto.ExpiryDate;
        banner.IsActive = dto.IsActive;
        banner.ImageUrl = dto.ImageUrl.Trim();
        banner.CtaText = string.IsNullOrWhiteSpace(dto.CtaText) ? "Ver ofertas" : dto.CtaText.Trim();
        banner.CtaUrl = string.IsNullOrWhiteSpace(dto.CtaUrl) ? "#catalogo" : dto.CtaUrl.Trim();
        banner.SortOrder = dto.SortOrder;
    }
}
