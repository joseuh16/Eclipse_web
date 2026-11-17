using Eclipse.Api.Domain.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Eclipse.Api.Services;

public class JwtOptions
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "eclipse-api";
    public string Audience { get; set; } = "eclipse-clients";
    public int ExpiryMinutes { get; set; } = 480;
}

public class JwtService(IConfiguration configuration)
{
    public (string Token, DateTime ExpiresAtUtc) CreateToken(AdminUser user)
    {
        var section = configuration.GetSection("Jwt");
        var options = section.Get<JwtOptions>() ?? new JwtOptions();
        var key = options.Key;

        if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32)
        {
            throw new InvalidOperationException("Jwt:Key debe tener al menos 32 bytes.");
        }

        var expires = DateTime.UtcNow.AddMinutes(options.ExpiryMinutes <= 0 ? 480 : options.ExpiryMinutes);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
