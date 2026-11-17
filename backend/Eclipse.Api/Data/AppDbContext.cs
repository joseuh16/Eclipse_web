using Eclipse.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Eclipse.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ThemeConfig> ThemeConfigs => Set<ThemeConfig>();
    public DbSet<Banner> Banners => Set<Banner>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<PaymentSettings> PaymentSettings => Set<PaymentSettings>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<Combo> Combos => Set<Combo>();

    private static readonly ValueConverter<DateTime, DateTime> UtcConverter = new(
        value => value.ToUniversalTime(),
        value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static readonly ValueConverter<DateTime?, DateTime?> NullableUtcConverter = new(
        value => value.HasValue ? value.Value.ToUniversalTime() : value,
        value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("Products");
            entity.Property(p => p.Name).HasMaxLength(160).IsRequired();
            entity.Property(p => p.Category).HasConversion<string>().HasMaxLength(24);
            entity.Property(p => p.BasePrice).HasPrecision(10, 2);
            entity.Property(p => p.ImageUrl).HasMaxLength(1000);
            entity.HasIndex(p => p.Category);
            entity.HasIndex(p => p.IsActive);
            entity.HasIndex(p => p.IsFeatured);
        });

        modelBuilder.Entity<ThemeConfig>(entity =>
        {
            entity.ToTable("ThemeConfigs");
            entity.Property(t => t.ThemeKey).HasMaxLength(32).IsRequired();
            entity.Property(t => t.PrimaryColor).HasMaxLength(16);
            entity.Property(t => t.SecondaryColor).HasMaxLength(16);
            entity.Property(t => t.AccentColor).HasMaxLength(16);
            entity.Property(t => t.BackgroundColor).HasMaxLength(16);
            entity.Property(t => t.FontStyle).HasMaxLength(64);
            entity.Property(t => t.CustomCss).HasColumnType("longtext");
            entity.HasIndex(t => t.ThemeKey).IsUnique();
        });

        modelBuilder.Entity<Banner>(entity =>
        {
            entity.ToTable("Banners");
            entity.Property(b => b.Title).HasMaxLength(160).IsRequired();
            entity.Property(b => b.Description).HasMaxLength(600);
            entity.Property(b => b.DiscountText).HasMaxLength(80);
            entity.Property(b => b.ImageUrl).HasMaxLength(1000);
            entity.Property(b => b.CtaText).HasMaxLength(60);
            entity.Property(b => b.CtaUrl).HasMaxLength(300);
        });

        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.ToTable("Coupons");
            entity.Property(c => c.Code).HasMaxLength(40).IsRequired();
            entity.HasIndex(c => c.Code).IsUnique();
        });

        modelBuilder.Entity<PaymentSettings>(entity =>
        {
            entity.ToTable("PaymentSettings");
            entity.Property(p => p.BankName).HasMaxLength(80);
            entity.Property(p => p.Beneficiary).HasMaxLength(160);
            entity.Property(p => p.ClabeNumber).HasMaxLength(30);
            entity.Property(p => p.MercadoPagoClabe).HasMaxLength(30);
            entity.Property(p => p.OxxoReference).HasMaxLength(60);
            entity.Property(p => p.WhatsAppNumber).HasMaxLength(30);
            entity.Property(p => p.SupportEmail).HasMaxLength(160);
            entity.Property(p => p.PaymentNote).HasMaxLength(1000);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders");
            entity.Property(o => o.OrderNumber).HasMaxLength(40).IsRequired();
            entity.HasIndex(o => o.OrderNumber).IsUnique();
            entity.Property(o => o.CustomerName).HasMaxLength(160).IsRequired();
            entity.Property(o => o.CustomerEmail).HasMaxLength(160);
            entity.Property(o => o.CustomerPhone).HasMaxLength(30);
            entity.Property(o => o.Subtotal).HasPrecision(12, 2);
            entity.Property(o => o.DiscountAmount).HasPrecision(12, 2);
            entity.Property(o => o.TotalAmount).HasPrecision(12, 2);
            entity.Property(o => o.PaymentMethod).HasConversion<string>().HasMaxLength(24);
            entity.Property(o => o.Status).HasConversion<string>().HasMaxLength(24);
            entity.Property(o => o.CouponCode).HasMaxLength(40);
            entity.Property(o => o.Notes).HasMaxLength(1000);
            entity.Property(o => o.ItemsJson).HasColumnType("longtext");
            entity.HasIndex(o => o.Status);
            entity.HasIndex(o => o.CreatedAt);
        });

        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.ToTable("AdminUsers");
            entity.Property(u => u.Username).HasMaxLength(80).IsRequired();
            entity.Property(u => u.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(u => u.Role).HasMaxLength(40).IsRequired();
            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<Combo>(entity =>
        {
            entity.ToTable("Combos");
            entity.Property(c => c.Name).HasMaxLength(120).IsRequired();
            entity.Property(c => c.Description).HasMaxLength(400);
            entity.HasIndex(c => c.MinProfiles).IsUnique();
        });

        // Normalize every DateTime read from MySQL as UTC.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(UtcConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(NullableUtcConverter);
                }
            }
        }
    }
}
