using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Eclipse.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/coupons")]
public class CouponsController(AppDbContext db) : ControllerBase
{
    [HttpPost("validate")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<ActionResult<CouponValidationDto>> Validate([FromBody] ValidateCouponDto dto)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        var coupon = await db.Coupons.AsNoTracking().FirstOrDefaultAsync(c => c.Code == code);
        var error = OrderService.ValidateCoupon(coupon);

        if (error is not null)
        {
            return Ok(new CouponValidationDto
            {
                Valid = false,
                Code = code,
                Message = error
            });
        }

        return Ok(new CouponValidationDto
        {
            Valid = true,
            Code = coupon!.Code,
            DiscountPercent = coupon.DiscountPercent,
            Message = $"Cupón aplicado: {coupon.DiscountPercent}% de descuento."
        });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<CouponDto>>> GetAll()
    {
        var coupons = await db.Coupons.AsNoTracking().OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(coupons.Select(c => c.ToDto()).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CouponDto>> Create(CouponUpsertDto dto)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        if (await db.Coupons.AnyAsync(c => c.Code == code))
        {
            return Conflict(new { message = "Ya existe un cupón con ese código." });
        }

        var coupon = new Coupon
        {
            Code = code,
            DiscountPercent = dto.DiscountPercent,
            MaxUses = dto.MaxUses,
            ExpiryDate = dto.ExpiryDate,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        db.Coupons.Add(coupon);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = coupon.Id }, coupon.ToDto());
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CouponDto>> Update(int id, CouponUpsertDto dto)
    {
        var coupon = await db.Coupons.FindAsync(id);
        if (coupon is null)
        {
            return NotFound(new { message = "Cupón no encontrado." });
        }

        var code = dto.Code.Trim().ToUpperInvariant();
        if (await db.Coupons.AnyAsync(c => c.Code == code && c.Id != id))
        {
            return Conflict(new { message = "Ya existe un cupón con ese código." });
        }

        coupon.Code = code;
        coupon.DiscountPercent = dto.DiscountPercent;
        coupon.MaxUses = dto.MaxUses;
        coupon.ExpiryDate = dto.ExpiryDate;
        coupon.IsActive = dto.IsActive;

        await db.SaveChangesAsync();
        return Ok(coupon.ToDto());
    }

    [HttpPatch("{id:int}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CouponDto>> Toggle(int id)
    {
        var coupon = await db.Coupons.FindAsync(id);
        if (coupon is null)
        {
            return NotFound(new { message = "Cupón no encontrado." });
        }

        coupon.IsActive = !coupon.IsActive;
        await db.SaveChangesAsync();
        return Ok(coupon.ToDto());
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var coupon = await db.Coupons.FindAsync(id);
        if (coupon is null)
        {
            return NotFound(new { message = "Cupón no encontrado." });
        }

        db.Coupons.Remove(coupon);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
