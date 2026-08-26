using System.ComponentModel.DataAnnotations;

namespace AttendanceAPI.Models
{
    public class Shift
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // Check-in window
        public TimeOnly CheckInStart { get; set; }      // e.g. 09:00
        public TimeOnly CheckInEnd { get; set; }        // e.g. 09:15
        public TimeOnly CheckInEarlyBefore { get; set; } // before this = early

        // Check-out window
        public TimeOnly CheckOutStart { get; set; }     // e.g. 16:00
        public TimeOnly CheckOutEnd { get; set; }       // e.g. 16:15
        public TimeOnly CheckOutEarlyBefore { get; set; } // before this = early (red)

        [MaxLength(255)]
        public string? Description { get; set; }

        // Navigation
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
