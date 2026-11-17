using Eclipse.Api.Data;
using Eclipse.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Eclipse.Api;

public static class DbInitializer
{
    public static async Task InitializeAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseInitializer");
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        const int maxAttempts = 15;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await db.Database.EnsureCreatedAsync();
                await DbSeeder.SeedAsync(db, configuration, passwordService, logger);
                logger.LogInformation("Base de datos lista (intento {Attempt}).", attempt);
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                logger.LogWarning(ex, "MySQL aún no está disponible (intento {Attempt}/{Max}). Reintentando en 4s...", attempt, maxAttempts);
                await Task.Delay(TimeSpan.FromSeconds(4));
            }
        }
    }
}
