using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AttendanceAPI.Data;
using AttendanceAPI.DTOs;
using AttendanceAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AttendanceAPI.Services
{
    public class AuthService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AuthService(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            var user = await _db.Users
                .Include(u => u.Department)
                .Include(u => u.Shift)
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

            if (user == null) return null;
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)) return null;

            var token = GenerateJwt(user);

            return new LoginResponse
            {
                Token          = token,
                Role           = user.Role.ToString(),
                UserId             = user.Id,
                Username           = user.Username,
                FirstName          = user.FirstName,
                LastName           = user.LastName,
                DepartmentId       = user.DepartmentId,
                DepartmentName     = user.Department?.Name,
                ShiftId            = user.ShiftId,
                MustChangePassword = user.MustChangePassword
            };
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(int userId, ChangePasswordRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
                return (false, "Password must be at least 6 characters long.");

            var user = await _db.Users.FindAsync(userId);
            if (user == null)
                return (false, "User not found.");

            // If user provided old password, verify it
            if (!string.IsNullOrEmpty(req.OldPassword) && !BCrypt.Net.BCrypt.Verify(req.OldPassword, user.PasswordHash))
                return (false, "Current password is incorrect.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            user.MustChangePassword = false;
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return (true, "Password changed successfully.");
        }

        private string GenerateJwt(User user)
        {
            var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds   = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddDays(7);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name,           user.Username),
                new Claim(ClaimTypes.Role,           user.Role.ToString()),
                new Claim("departmentId",            user.DepartmentId?.ToString() ?? ""),
                new Claim("shiftId",                 user.ShiftId?.ToString() ?? "")
            };

            var token = new JwtSecurityToken(
                issuer:             _config["Jwt:Issuer"],
                audience:           _config["Jwt:Audience"],
                claims:             claims,
                expires:            expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
