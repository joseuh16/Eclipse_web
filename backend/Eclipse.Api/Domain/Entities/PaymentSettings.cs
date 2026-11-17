namespace Eclipse.Api.Domain.Entities;

public class PaymentSettings
{
    public int Id { get; set; }
    public string BankName { get; set; } = "BBVA";
    public string Beneficiary { get; set; } = string.Empty;
    public string ClabeNumber { get; set; } = string.Empty;
    public string MercadoPagoClabe { get; set; } = string.Empty;
    public string OxxoReference { get; set; } = string.Empty;
    public string WhatsAppNumber { get; set; } = string.Empty;
    public string SupportEmail { get; set; } = string.Empty;
    public string PaymentNote { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
