namespace AttendanceAPI.DTOs
{
    // ─── Auth ─────────────────────────────────────────────────────────────────
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int? ShiftId { get; set; }
        public bool MustChangePassword { get; set; }
    }

    // ─── Department ───────────────────────────────────────────────────────────
    public class DepartmentDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double RadiusMeters { get; set; }
        public string? Description { get; set; }
    }

    public class CreateDepartmentRequest
    {
        public string Name { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double RadiusMeters { get; set; } = 50;
        public string? Description { get; set; }
    }

    // ─── Shift ────────────────────────────────────────────────────────────────
    public class ShiftDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    // ─── User / Mentor / Intern ───────────────────────────────────────────────
    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int? MentorId { get; set; }
        public string? MentorName { get; set; }
        public int? ShiftId { get; set; }
        public string? ShiftName { get; set; }
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }
        public bool HasFace { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string? OldPassword { get; set; }
        public string NewPassword { get; set; } = string.Empty;
    }

    public class CreateMentorRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public int DepartmentId { get; set; }
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateMentorRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public int DepartmentId { get; set; }
        public string? Password { get; set; } // null = don't change
        public bool IsActive { get; set; } = true;
    }

    public class CreateInternRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public int DepartmentId { get; set; }
        public int ShiftId { get; set; }
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateInternRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public int DepartmentId { get; set; }
        public int ShiftId { get; set; }
        public string? Password { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class TransferInternRequest
    {
        public int DepartmentId { get; set; }
        public int MentorId { get; set; }
    }

    // ─── Attendance ───────────────────────────────────────────────────────────
    public class MarkAttendanceRequest
    {
        public string Type { get; set; } = "checkin"; // "checkin" | "checkout"
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string FaceDescriptor { get; set; } = string.Empty; // Base64 image or JSON float array
        public string? LivenessChallenge { get; set; } // e.g. "blink", "turn_left", "turn_right", "smile"
        public bool LivenessPassed { get; set; } = true;
    }

    public class AttendanceRecordDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string InternName { get; set; } = string.Empty;
        public string InternUsername { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public DateTime? CheckInTime { get; set; }
        public string CheckInStatus { get; set; } = string.Empty;
        public DateTime? CheckOutTime { get; set; }
        public string CheckOutStatus { get; set; } = string.Empty;
        public string OverallStatus { get; set; } = string.Empty;
        public bool CheckInFaceVerified { get; set; }
        public bool CheckInGeoVerified { get; set; }
        public bool CheckOutFaceVerified { get; set; }
        public bool CheckOutGeoVerified { get; set; }
    }

    // ─── Face ─────────────────────────────────────────────────────────────────
    public class RegisterFaceRequest
    {
        public string FaceDescriptor { get; set; } = string.Empty;
    }

    public class GetFaceDescriptorResponse
    {
        public string FaceDescriptor { get; set; } = string.Empty;
    }
}
