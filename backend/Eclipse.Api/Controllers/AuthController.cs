using Eclipse.Api.Data;
using Eclipse.Api.Dtos;
using Eclipse.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Eclipse.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IPasswordService passwordService, JwtService jwtService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponseDto>> Login(LoginRequestDto dto)
    {
        var username = dto.Username.Trim().ToLowerInvariant();
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Username.ToLower() == username);

        if (user is null || !passwordService.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Usuario o contraseña incorrectos." });
        }

        if (!string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var (token, expires) = jwtService.CreateToken(user);
        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new LoginResponseDto
        {
            Token = token,
            ExpiresAtUtc = expires,
            User = new AdminUserDto
            {
                Id = user.Id,
                Username = user.Username,
                Role = user.Role,
                LastLoginAt = user.LastLoginAt
            }
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AdminUserDto>> Me()
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(idValue, out var id))
        {
            return Unauthorized();
        }

        var user = await db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new AdminUserDto
        {
            Id = user.Id,
            Username = user.Username,
            Role = user.Role,
            LastLoginAt = user.LastLoginAt
        });
    }
}
