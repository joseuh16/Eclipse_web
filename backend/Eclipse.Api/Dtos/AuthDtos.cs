using System.ComponentModel.DataAnnotations;

namespace Eclipse.Api.Dtos;

public class LoginRequestDto
{
    [Required, StringLength(80)]
    public string Username { get; set; } = string.Empty;

    [Required, StringLength(200, MinimumLength = 4)]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public AdminUserDto User { get; set; } = new();
}

public class AdminUserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime? LastLoginAt { get; set; }
}
