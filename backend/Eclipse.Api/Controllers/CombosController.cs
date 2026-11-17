using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/combos")]
public class CombosController(AppDbContext db) : ControllerBase
{
    [HttpGet("active")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ComboDto>>> GetActive()
    {
        var combos = await db.Combos.AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.MinProfiles)
            .ToListAsync();

        return Ok(combos.Select(c => c.ToDto()).ToList());
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<ComboDto>>> GetAll()
    {
        var combos = await db.Combos.AsNoTracking().OrderBy(c => c.MinProfiles).ToListAsync();
        return Ok(combos.Select(c => c.ToDto()).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ComboDto>> Create(ComboUpsertDto dto)
    {
        if (await db.Combos.AnyAsync(c => c.MinProfiles == dto.MinProfiles))
        {
            return Conflict(new { message = "Ya existe un nivel para esa cantidad de perfiles." });
        }

        var combo = new Combo
        {
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim(),
            MinProfiles = dto.MinProfiles,
            DiscountPercent = dto.DiscountPercent,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        db.Combos.Add(combo);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = combo.Id }, combo.ToDto());
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ComboDto>> Update(int id, ComboUpsertDto dto)
    {
        var combo = await db.Combos.FindAsync(id);
        if (combo is null)
        {
            return NotFound(new { message = "Nivel de combo no encontrado." });
        }

        if (await db.Combos.AnyAsync(c => c.MinProfiles == dto.MinProfiles && c.Id != id))
        {
            return Conflict(new { message = "Ya existe un nivel para esa cantidad de perfiles." });
        }

        combo.Name = dto.Name.Trim();
        combo.Description = dto.Description.Trim();
        combo.MinProfiles = dto.MinProfiles;
        combo.DiscountPercent = dto.DiscountPercent;
        combo.IsActive = dto.IsActive;

        await db.SaveChangesAsync();
        return Ok(combo.ToDto());
    }

    [HttpPatch("{id:int}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ComboDto>> Toggle(int id)
    {
        var combo = await db.Combos.FindAsync(id);
        if (combo is null)
        {
            return NotFound(new { message = "Nivel de combo no encontrado." });
        }

        combo.IsActive = !combo.IsActive;
        await db.SaveChangesAsync();
        return Ok(combo.ToDto());
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var combo = await db.Combos.FindAsync(id);
        if (combo is null)
        {
            return NotFound(new { message = "Nivel de combo no encontrado." });
        }

        db.Combos.Remove(combo);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
