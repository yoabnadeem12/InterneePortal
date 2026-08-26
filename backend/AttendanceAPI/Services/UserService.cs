using AttendanceAPI.Data;
using AttendanceAPI.DTOs;
using AttendanceAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace AttendanceAPI.Services
{
    public class UserService
    {
        private readonly AppDbContext _db;
        private readonly EmailService _emailService;

        public UserService(AppDbContext db, EmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

        // ─── Mentors ──────────────────────────────────────────────────────────

        public async Task<List<UserDto>> GetMentorsAsync()
        {
            return await _db.Users
                .Where(u => u.Role == UserRole.Mentor)
                .Include(u => u.Department)
                .Select(u => MapToDto(u))
                .ToListAsync();
        }

        public async Task<UserDto?> GetMentorByIdAsync(int id)
        {
            var u = await _db.Users
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor);
            return u == null ? null : MapToDto(u);
        }

        public async Task<UserDto> CreateMentorAsync(CreateMentorRequest req)
        {
            var dept = await _db.Departments.FindAsync(req.DepartmentId)
                       ?? throw new Exception("Department not found");

            var username = $"{req.FirstName.ToLower()}.Mentor.{dept.Name.Replace(" ", "")}";

            // Make username unique by appending number if needed
            var baseUsername = username;
            var counter = 2;
            while (await _db.Users.AnyAsync(u => u.Username == username))
                username = $"{baseUsername}{counter++}";

            var user = new User
            {
                Username     = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role         = UserRole.Mentor,
                FirstName    = req.FirstName,
                LastName     = req.LastName,
                Email        = req.Email,
                DepartmentId = req.DepartmentId,
                IsActive     = true,
                CreatedAt    = DateTime.UtcNow,
                UpdatedAt    = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await _db.Entry(user).Reference(u => u.Department).LoadAsync();

            // Send credentials to mentor's email if provided
            if (!string.IsNullOrWhiteSpace(req.Email))
            {
                _ = Task.Run(async () =>
                {
                    await _emailService.SendCredentialsEmailAsync(
                        req.Email.Trim(),
                        $"{req.FirstName} {req.LastName}",
                        username,
                        req.Password,
                        user.Department?.Name
                    );
                });
            }

            return MapToDto(user);
        }

        public async Task<UserDto?> UpdateMentorAsync(int id, UpdateMentorRequest req)
        {
            var user = await _db.Users
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Mentor);
            if (user == null) return null;

            var dept = await _db.Departments.FindAsync(req.DepartmentId)
                       ?? throw new Exception("Department not found");

            user.FirstName    = req.FirstName;
            user.LastName     = req.LastName;
            user.Email        = req.Email;
            user.DepartmentId = req.DepartmentId;
            user.IsActive     = req.IsActive;
            user.UpdatedAt    = DateTime.UtcNow;

            // Regenerate username
            user.Username = $"{req.FirstName.ToLower()}.Mentor.{dept.Name.Replace(" ", "")}";

            if (!string.IsNullOrEmpty(req.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);

            await _db.SaveChangesAsync();
            await _db.Entry(user).Reference(u => u.Department).LoadAsync();
            return MapToDto(user);
        }

        public async Task<bool> DeleteMentorAsync(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null || user.Role != UserRole.Mentor) return false;
            user.IsActive  = false;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        // ─── Interns ──────────────────────────────────────────────────────────

        public async Task<List<UserDto>> GetInternsByMentorAsync(int mentorId)
        {
            return await _db.Users
                .Where(u => u.Role == UserRole.Intern && u.MentorId == mentorId && u.IsActive)
                .Include(u => u.Department)
                .Include(u => u.Shift)
                .Include(u => u.Mentor)
                .Select(u => MapToDto(u))
                .ToListAsync();
        }

        public async Task<UserDto?> GetInternByIdAsync(int id)
        {
            var u = await _db.Users
                .Include(u => u.Department)
                .Include(u => u.Shift)
                .Include(u => u.Mentor)
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Intern);
            return u == null ? null : MapToDto(u);
        }

        public async Task<UserDto> CreateInternAsync(int mentorId, CreateInternRequest req)
        {
            // Auto-increment serial
            var tracker = await _db.InternSerialTrackers.FindAsync(1)
                          ?? throw new Exception("Serial tracker not found");
            tracker.LastSerial++;
            var serial   = tracker.LastSerial.ToString("D3"); // 001, 002, ...
            var username = $"{req.FirstName.ToLower()}.PIA.{serial}";

            // Auto-generate secure temporary password if not provided
            var initialPassword = !string.IsNullOrWhiteSpace(req.Password) ? req.Password.Trim() : GenerateTemporaryPassword();

            var user = new User
            {
                Username           = username,
                PasswordHash       = BCrypt.Net.BCrypt.HashPassword(initialPassword),
                Role               = UserRole.Intern,
                FirstName          = req.FirstName,
                LastName           = req.LastName,
                Email              = req.Email,
                DepartmentId       = req.DepartmentId,
                MentorId           = mentorId,
                ShiftId            = req.ShiftId,
                MustChangePassword = true,
                IsActive           = true,
                CreatedAt          = DateTime.UtcNow,
                UpdatedAt          = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await _db.Entry(user).Reference(u => u.Department).LoadAsync();
            await _db.Entry(user).Reference(u => u.Shift).LoadAsync();
            await _db.Entry(user).Reference(u => u.Mentor).LoadAsync();

            // Send credentials to student's Gmail in background
            if (!string.IsNullOrWhiteSpace(req.Email))
            {
                _ = Task.Run(async () =>
                {
                    await _emailService.SendCredentialsEmailAsync(
                        req.Email.Trim(),
                        $"{req.FirstName} {req.LastName}",
                        username,
                        initialPassword,
                        user.Department?.Name,
                        user.Shift?.Name
                    );
                });
            }

            return MapToDto(user);
        }

        public async Task<UserDto?> UpdateInternAsync(int id, int mentorId, UpdateInternRequest req)
        {
            var user = await _db.Users
                .Include(u => u.Department)
                .Include(u => u.Shift)
                .Include(u => u.Mentor)
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Intern && u.MentorId == mentorId);
            if (user == null) return null;

            user.FirstName    = req.FirstName;
            user.LastName     = req.LastName;
            user.Email        = req.Email;
            user.DepartmentId = req.DepartmentId;
            user.ShiftId      = req.ShiftId;
            user.IsActive     = req.IsActive;
            user.UpdatedAt    = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(req.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
                user.MustChangePassword = false;
            }

            await _db.SaveChangesAsync();
            return MapToDto(user);
        }

        public async Task<bool> DeleteInternAsync(int id, int mentorId)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null || user.Role != UserRole.Intern || user.MentorId != mentorId) return false;
            user.IsActive  = false;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<UserDto?> TransferInternAsync(int internId, int currentMentorId, int targetDeptId, int targetMentorId)
        {
            var intern = await _db.Users
                .Include(u => u.Department)
                .Include(u => u.Shift)
                .Include(u => u.Mentor)
                .FirstOrDefaultAsync(u => u.Id == internId && u.Role == UserRole.Intern && u.MentorId == currentMentorId && u.IsActive);

            if (intern == null) return null;

            var dept = await _db.Departments.FindAsync(targetDeptId)
                       ?? throw new Exception("Target department not found.");

            var targetMentor = await _db.Users
                .FirstOrDefaultAsync(u => u.Id == targetMentorId && u.Role == UserRole.Mentor && u.DepartmentId == targetDeptId && u.IsActive)
                ?? throw new Exception("Target mentor not found or does not belong to the selected department.");

            intern.DepartmentId = targetDeptId;
            intern.MentorId     = targetMentorId;
            intern.UpdatedAt    = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            await _db.Entry(intern).Reference(u => u.Department).LoadAsync();
            await _db.Entry(intern).Reference(u => u.Shift).LoadAsync();
            await _db.Entry(intern).Reference(u => u.Mentor).LoadAsync();

            return MapToDto(intern);
        }

        private static string GenerateTemporaryPassword()
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnopqrstuvwxyz";
            const string digits = "23456789";
            const string special = "!@#$";
            var random = new Random();

            var chars = new List<char>
            {
                upper[random.Next(upper.Length)],
                lower[random.Next(lower.Length)],
                digits[random.Next(digits.Length)],
                special[random.Next(special.Length)]
            };

            const string all = upper + lower + digits + special;
            while (chars.Count < 8)
            {
                chars.Add(all[random.Next(all.Length)]);
            }

            return new string(chars.OrderBy(_ => random.Next()).ToArray());
        }

        // ─── Mapper ───────────────────────────────────────────────────────────

        private static UserDto MapToDto(User u) => new()
        {
            Id                 = u.Id,
            Username           = u.Username,
            Role               = u.Role.ToString(),
            FirstName          = u.FirstName,
            LastName           = u.LastName,
            Email              = u.Email,
            DepartmentId       = u.DepartmentId,
            DepartmentName     = u.Department?.Name,
            MentorId           = u.MentorId,
            MentorName         = u.Mentor != null ? $"{u.Mentor.FirstName} {u.Mentor.LastName}" : null,
            ShiftId            = u.ShiftId,
            ShiftName          = u.Shift?.Name,
            IsActive           = u.IsActive,
            MustChangePassword = u.MustChangePassword,
            HasFace            = !string.IsNullOrEmpty(u.FaceDescriptor),
            CreatedAt          = u.CreatedAt
        };
    }
}
