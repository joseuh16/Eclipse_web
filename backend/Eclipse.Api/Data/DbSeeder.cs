using Eclipse.Api.Domain.Entities;
using Eclipse.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config, IPasswordService passwordService, ILogger logger)
    {
        await SeedAdminAsync(db, config, passwordService, logger);
        await SeedProductsAsync(db);
        await SeedThemesAsync(db);
        await SeedBannersAsync(db);
        await SeedCouponsAsync(db);
        await SeedCombosAsync(db);
        await SeedSettingsAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task SeedAdminAsync(AppDbContext db, IConfiguration config, IPasswordService passwordService, ILogger logger)
    {
        var username = config["Seed:AdminUsername"]?.Trim();
        var password = config["Seed:AdminPassword"];
        var passwordIsConfigured = !string.IsNullOrWhiteSpace(password);

        if (string.IsNullOrWhiteSpace(username)) username = "admin";
        if (!passwordIsConfigured) password = "Eclipse2026!";

        var normalizedUsername = username.ToLowerInvariant();
        var existing = await db.AdminUsers
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsername);

        if (existing is null)
        {
            db.AdminUsers.Add(new AdminUser
            {
                Username = username,
                PasswordHash = passwordService.Hash(password!),
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            });

            logger.LogWarning("Se creó el usuario administrador inicial '{Username}'. Cambia la contraseña mediante ADMIN_PASSWORD en producción.", username);
            return;
        }

        // ADMIN_PASSWORD / Seed:AdminPassword manda: si el valor configurado ya no
        // coincide con el hash guardado, se actualiza para que el login no quede
        // bloqueado con una contraseña vieja tras cambiar la configuración.
        if (passwordIsConfigured && !passwordService.Verify(password!, existing.PasswordHash))
        {
            existing.PasswordHash = passwordService.Hash(password!);
            logger.LogWarning("Se actualizó la contraseña de '{Username}' desde la configuración del servidor.", existing.Username);
        }

        if (!string.Equals(existing.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            existing.Role = "Admin";
            logger.LogWarning("Se restauró el rol Admin para '{Username}'.", existing.Username);
        }
    }

    private static async Task SeedProductsAsync(AppDbContext db)
    {
        if (await db.Products.AnyAsync())
        {
            return;
        }

        var now = DateTime.UtcNow;
        var products = new List<Product>
        {
            // Video / streaming
            new() { Name = "Netflix Premium 4K — 1 pantalla", Category = ProductCategory.Video, BasePrice = 199m, DiscountPercent = 20, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1000&q=80", IsFeatured = true, CreatedAt = now.AddDays(-32) },
            new() { Name = "Disney+ Premium — 4K sin anuncios", Category = ProductCategory.Video, BasePrice = 159m, DiscountPercent = 15, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-31) },
            new() { Name = "HBO Max Sin Anuncios", Category = ProductCategory.Video, BasePrice = 149m, DiscountPercent = 18, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-30) },
            new() { Name = "Prime Video + MGM", Category = ProductCategory.Video, BasePrice = 119m, DiscountPercent = 12, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-29) },

            // IA
            new() { Name = "ChatGPT Plus", Category = ProductCategory.IA, BasePrice = 399m, DiscountPercent = 15, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=80", IsFeatured = true, CreatedAt = now.AddDays(-28) },
            new() { Name = "Claude Pro", Category = ProductCategory.IA, BasePrice = 389m, DiscountPercent = 12, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-27) },
            new() { Name = "Midjourney Standard", Category = ProductCategory.IA, BasePrice = 349m, DiscountPercent = 20, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1686191128892-3b37add4c844?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-26) },
            new() { Name = "Perplexity Pro", Category = ProductCategory.IA, BasePrice = 299m, DiscountPercent = 25, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-25) },

            // Edición
            new() { Name = "Adobe Creative Cloud — Todas las apps", Category = ProductCategory.Edicion, BasePrice = 699m, DiscountPercent = 25, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1000&q=80", IsFeatured = true, CreatedAt = now.AddDays(-24) },
            new() { Name = "Canva Pro", Category = ProductCategory.Edicion, BasePrice = 179m, DiscountPercent = 30, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-23) },
            new() { Name = "CapCut Pro", Category = ProductCategory.Edicion, BasePrice = 149m, DiscountPercent = 20, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-22) },
            new() { Name = "Filmora 13 Pro", Category = ProductCategory.Edicion, BasePrice = 229m, DiscountPercent = 18, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-21) },

            // Escolar
            new() { Name = "Microsoft 365 Personal", Category = ProductCategory.Escolar, BasePrice = 249m, DiscountPercent = 20, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80", IsFeatured = true, CreatedAt = now.AddDays(-20) },
            new() { Name = "Duolingo Super", Category = ProductCategory.Escolar, BasePrice = 129m, DiscountPercent = 25, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-19) },
            new() { Name = "Coursera Plus", Category = ProductCategory.Escolar, BasePrice = 499m, DiscountPercent = 30, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-18) },
            new() { Name = "Biblioteca Digital + Idiomas", Category = ProductCategory.Escolar, BasePrice = 199m, DiscountPercent = 15, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-17) },

            // Música
            new() { Name = "Spotify Premium Individual", Category = ProductCategory.Musica, BasePrice = 129m, DiscountPercent = 10, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1000&q=80", IsFeatured = true, CreatedAt = now.AddDays(-16) },
            new() { Name = "YouTube Premium", Category = ProductCategory.Musica, BasePrice = 139m, DiscountPercent = 15, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-15) },
            new() { Name = "Apple Music", Category = ProductCategory.Musica, BasePrice = 119m, DiscountPercent = 12, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-14) },
            new() { Name = "Deezer HiFi", Category = ProductCategory.Musica, BasePrice = 109m, DiscountPercent = 18, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-13) },

            // Deportes
            new() { Name = "DAZN Total", Category = ProductCategory.Deportes, BasePrice = 249m, DiscountPercent = 15, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=80", IsFeatured = true, CreatedAt = now.AddDays(-12) },
            new() { Name = "NBA League Pass", Category = ProductCategory.Deportes, BasePrice = 399m, DiscountPercent = 20, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-11) },
            new() { Name = "F1 TV Pro", Category = ProductCategory.Deportes, BasePrice = 279m, DiscountPercent = 18, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-10) },
            new() { Name = "UFC Fight Pass", Category = ProductCategory.Deportes, BasePrice = 229m, DiscountPercent = 12, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-9) },

            // Lifelong / productividad
            new() { Name = "NordVPN + Gestor de contraseñas", Category = ProductCategory.Lifelong, BasePrice = 199m, DiscountPercent = 30, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1000&q=80", IsFeatured = true, CreatedAt = now.AddDays(-8) },
            new() { Name = "Google One 2 TB", Category = ProductCategory.Lifelong, BasePrice = 249m, DiscountPercent = 20, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-7) },
            new() { Name = "Microsoft 365 Familia — 6 usuarios", Category = ProductCategory.Lifelong, BasePrice = 349m, DiscountPercent = 22, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-6) },
            new() { Name = "Malwarebytes Premium", Category = ProductCategory.Lifelong, BasePrice = 159m, DiscountPercent = 25, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80", CreatedAt = now.AddDays(-5) },

            // AdultPlus (+18)
            new() { Name = "After Hours Premium", Category = ProductCategory.AdultPlus, BasePrice = 169m, DiscountPercent = 10, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=80", IsAdultOnly = true, CreatedAt = now.AddDays(-4) },
            new() { Name = "Club Privado VIP", Category = ProductCategory.AdultPlus, BasePrice = 299m, DiscountPercent = 20, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80", IsAdultOnly = true, IsFeatured = true, CreatedAt = now.AddDays(-3) },
            new() { Name = "Cine Erótico Ilimitado", Category = ProductCategory.AdultPlus, BasePrice = 129m, DiscountPercent = 15, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80", IsAdultOnly = true, CreatedAt = now.AddDays(-2) },
            new() { Name = "Parejas Playroom", Category = ProductCategory.AdultPlus, BasePrice = 199m, DiscountPercent = 25, DurationMonths = 1, ImageUrl = "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1000&q=80", IsAdultOnly = true, CreatedAt = now.AddDays(-1) }
        };

        db.Products.AddRange(products);
    }

    private static async Task SeedThemesAsync(AppDbContext db)
    {
        if (await db.ThemeConfigs.AnyAsync())
        {
            return;
        }

        db.ThemeConfigs.AddRange(
            new ThemeConfig { ThemeKey = "base", PrimaryColor = "#8B5CF6", SecondaryColor = "#22D3EE", AccentColor = "#FBBF24", BackgroundColor = "#06060D", FontStyle = "Sora", IsActive = true, UpdatedAt = DateTime.UtcNow },
            new ThemeConfig { ThemeKey = "autumn", PrimaryColor = "#F59E0B", SecondaryColor = "#B45309", AccentColor = "#FDE68A", BackgroundColor = "#140C06", FontStyle = "Fraunces", UpdatedAt = DateTime.UtcNow },
            new ThemeConfig { ThemeKey = "halloween", PrimaryColor = "#A855F7", SecondaryColor = "#F97316", AccentColor = "#84CC16", BackgroundColor = "#0B0710", FontStyle = "Space Grotesk", UpdatedAt = DateTime.UtcNow },
            new ThemeConfig { ThemeKey = "christmas", PrimaryColor = "#DC2626", SecondaryColor = "#16A34A", AccentColor = "#FACC15", BackgroundColor = "#07120D", FontStyle = "Outfit", UpdatedAt = DateTime.UtcNow },
            new ThemeConfig { ThemeKey = "reyes", PrimaryColor = "#CA8A04", SecondaryColor = "#7C3AED", AccentColor = "#0EA5E9", BackgroundColor = "#0B0A14", FontStyle = "Fraunces", UpdatedAt = DateTime.UtcNow }
        );
    }

    private static async Task SeedBannersAsync(AppDbContext db)
    {
        if (await db.Banners.AnyAsync())
        {
            return;
        }

        var expires = DateTime.UtcNow.AddDays(120);
        db.Banners.AddRange(
            new Banner
            {
                Title = "Tu entretenimiento, sin límites",
                Description = "Licencias originales de streaming, IA y productividad con entrega inmediata y soporte real.",
                DiscountText = "Hasta 35% OFF",
                ImageUrl = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1400&q=80",
                CtaText = "Explorar catálogo",
                CtaUrl = "#catalogo",
                ExpiryDate = expires,
                IsActive = true,
                SortOrder = 1
            },
            new Banner
            {
                Title = "Potencia tu creatividad con IA",
                Description = "Herramientas de inteligencia artificial para crear, diseñar y producir más rápido.",
                DiscountText = "30% OFF en IA",
                ImageUrl = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1400&q=80",
                CtaText = "Ver herramientas IA",
                CtaUrl = "#catalogo",
                ExpiryDate = expires,
                IsActive = true,
                SortOrder = 2
            },
            new Banner
            {
                Title = "Combos que sí convienen",
                Description = "Arma tu combo con 2 o más perfiles y desbloquea hasta 15% de descuento adicional.",
                DiscountText = "-5% · -10% · -15%",
                ImageUrl = "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?auto=format&fit=crop&w=1400&q=80",
                CtaText = "Crear mi combo",
                CtaUrl = "#combos",
                ExpiryDate = expires,
                IsActive = true,
                SortOrder = 3
            },
            new Banner
            {
                Title = "Entrega inmediata y soporte real",
                Description = "Recibe tu licencia el mismo día por correo o WhatsApp. Si algo falla, lo resolvemos contigo.",
                DiscountText = "Activación en minutos",
                ImageUrl = "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1400&q=80",
                CtaText = "Cómo funciona",
                CtaUrl = "#faq",
                ExpiryDate = expires,
                IsActive = true,
                SortOrder = 4
            }
        );
    }

    private static async Task SeedCouponsAsync(AppDbContext db)
    {
        if (await db.Coupons.AnyAsync())
        {
            return;
        }

        db.Coupons.AddRange(
            new Coupon { Code = "ECLIPSE10", DiscountPercent = 10, MaxUses = 500, UsedCount = 0, ExpiryDate = DateTime.UtcNow.AddDays(90), IsActive = true, CreatedAt = DateTime.UtcNow },
            new Coupon { Code = "BIENVENIDO5", DiscountPercent = 5, MaxUses = 1000, UsedCount = 0, ExpiryDate = DateTime.UtcNow.AddDays(180), IsActive = true, CreatedAt = DateTime.UtcNow },
            new Coupon { Code = "NAVIDAD15", DiscountPercent = 15, MaxUses = 300, UsedCount = 0, ExpiryDate = DateTime.UtcNow.AddDays(60), IsActive = true, CreatedAt = DateTime.UtcNow }
        );
    }

    private static async Task SeedCombosAsync(AppDbContext db)
    {
        if (await db.Combos.AnyAsync())
        {
            return;
        }

        db.Combos.AddRange(
            new Combo { Name = "Dúo Eclipse", Description = "2 perfiles: activa el primer nivel de descuento.", MinProfiles = 2, DiscountPercent = 5, IsActive = true, CreatedAt = DateTime.UtcNow },
            new Combo { Name = "Trío Eclipse", Description = "3 perfiles: más entretenimiento, mejor precio.", MinProfiles = 3, DiscountPercent = 10, IsActive = true, CreatedAt = DateTime.UtcNow },
            new Combo { Name = "Constelación Eclipse", Description = "4 o más perfiles: el descuento máximo del creador de combos.", MinProfiles = 4, DiscountPercent = 15, IsActive = true, CreatedAt = DateTime.UtcNow }
        );
    }

    private static async Task SeedSettingsAsync(AppDbContext db)
    {
        if (await db.PaymentSettings.AnyAsync())
        {
            return;
        }

        db.PaymentSettings.Add(new PaymentSettings
        {
            BankName = "BBVA México",
            Beneficiary = "Eclipse Digital MX",
            ClabeNumber = "012180015478965432",
            MercadoPagoClabe = "722969010123456789",
            OxxoReference = "ECLIPSE-4821",
            WhatsAppNumber = "5219852022975",
            SupportEmail = "pereclipsefeedback@gmail.com",
            PaymentNote = "Envía tu comprobante por WhatsApp indicando tu número de orden. Validamos tu pago en minutos y activamos tu licencia el mismo día.",
            UpdatedAt = DateTime.UtcNow
        });
    }
}
