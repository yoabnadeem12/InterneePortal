using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AttendanceAPI.Models
{
    public enum UserRole { Admin, Mentor, Intern }

    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; }

        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Email { get; set; }

        // Department reference
        public int? DepartmentId { get; set; }
        [ForeignKey("DepartmentId")]
        public Department? Department { get; set; }

        // Mentor (for interns only)
        public int? MentorId { get; set; }
        [ForeignKey("MentorId")]
        public User? Mentor { get; set; }

        // Shift (for interns only)
        public int? ShiftId { get; set; }
        [ForeignKey("ShiftId")]
        public Shift? Shift { get; set; }

        // Face recognition — stored as JSON float array (512-D MobileFaceNet embedding)
        public string? FaceDescriptor { get; set; }

        public bool MustChangePassword { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<User> Interns { get; set; } = new List<User>();
        public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    }
}
