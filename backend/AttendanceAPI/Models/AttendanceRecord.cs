using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AttendanceAPI.Models
{
    public enum CheckInStatus  { Early, OnTime, Late, NotYet }
    public enum CheckOutStatus { Early, OnTime, Late, NotYet }
    public enum AttendanceOverallStatus { Present, Incomplete, Absent }

    public class AttendanceRecord
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Required]
        public DateOnly Date { get; set; }

        // Check-in
        public DateTime? CheckInTime { get; set; }
        public CheckInStatus CheckInStatus { get; set; } = CheckInStatus.NotYet;
        public bool CheckInFaceVerified { get; set; } = false;
        public bool CheckInGeoVerified { get; set; } = false;
        public double? CheckInLatitude { get; set; }
        public double? CheckInLongitude { get; set; }

        // Check-out
        public DateTime? CheckOutTime { get; set; }
        public CheckOutStatus CheckOutStatus { get; set; } = CheckOutStatus.NotYet;
        public bool CheckOutFaceVerified { get; set; } = false;
        public bool CheckOutGeoVerified { get; set; } = false;
        public double? CheckOutLatitude { get; set; }
        public double? CheckOutLongitude { get; set; }

        // Overall
        public AttendanceOverallStatus OverallStatus { get; set; } = AttendanceOverallStatus.Absent;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
