using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class PaymentSettingsDto
{
    public int Id { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string Beneficiary { get; set; } = string.Empty;
    public string ClabeNumber { get; set; } = string.Empty;
    public string MercadoPagoClabe { get; set; } = string.Empty;
    public string OxxoReference { get; set; } = string.Empty;
    public string WhatsAppNumber { get; set; } = string.Empty;
    public string SupportEmail { get; set; } = string.Empty;
    public string PaymentNote { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class PaymentSettingsUpsertDto
{
    [Required, StringLength(80, MinimumLength = 2)]
    public string BankName { get; set; } = string.Empty;

    [Required, StringLength(160, MinimumLength = 2)]
    public string Beneficiary { get; set; } = string.Empty;

    [Required, StringLength(30, MinimumLength = 8)]
    public string ClabeNumber { get; set; } = string.Empty;

    [Required, StringLength(30, MinimumLength = 8)]
    public string MercadoPagoClabe { get; set; } = string.Empty;

    [Required, StringLength(60, MinimumLength = 3)]
    public string OxxoReference { get; set; } = string.Empty;

    [Required, StringLength(30, MinimumLength = 8)]
    public string WhatsAppNumber { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(160)]
    public string SupportEmail { get; set; } = string.Empty;

    [StringLength(1000)]
    public string PaymentNote { get; set; } = string.Empty;
}
