using Eclipse.Api.Data;
using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PaymentSettingsDto>> GetSettings()
    {
        var settings = await db.PaymentSettings.AsNoTracking().FirstOrDefaultAsync();
        return settings is null
            ? Ok(new PaymentSettingsDto { BankName = "BBVA", WhatsAppNumber = "5215512345678", SupportEmail = "soporte@techyuc.com" })
            : Ok(settings.ToDto());
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PaymentSettingsDto>> UpdateSettings(PaymentSettingsUpsertDto dto)
    {
        var settings = await db.PaymentSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new PaymentSettings();
            db.PaymentSettings.Add(settings);
        }

        settings.BankName = dto.BankName.Trim();
        settings.Beneficiary = dto.Beneficiary.Trim();
        settings.ClabeNumber = dto.ClabeNumber.Trim();
        settings.MercadoPagoClabe = dto.MercadoPagoClabe.Trim();
        settings.OxxoReference = dto.OxxoReference.Trim();
        settings.WhatsAppNumber = dto.WhatsAppNumber.Trim();
        settings.SupportEmail = dto.SupportEmail.Trim();
        settings.PaymentNote = dto.PaymentNote.Trim();
        settings.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(settings.ToDto());
    }
}
