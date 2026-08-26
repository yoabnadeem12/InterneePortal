using System.ComponentModel.DataAnnotations;

namespace AttendanceAPI.Models
{
    /// <summary>
    /// Tracks the last used serial number for intern usernames (PIA.001, PIA.002 ...)
    /// </summary>
    public class InternSerialTracker
    {
        [Key]
        public int Id { get; set; }

        public int LastSerial { get; set; } = 0;
    }
}
