using System.Security.Claims;
using AttendanceAPI.Data;
using AttendanceAPI.DTOs;
using AttendanceAPI.Models;
using AttendanceAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceAPI.Controllers
{
    [ApiController]
    [Route("api")]
    [Authorize(Roles = "Intern")]
    public class AttendanceController : ControllerBase
    {
        private readonly AttendanceService _attendance;
        private readonly FaceRecognitionService _faceService;
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public AttendanceController(AttendanceService attendance, FaceRecognitionService faceService, AppDbContext db, IWebHostEnvironment env)
        {
            _attendance  = attendance;
            _faceService = faceService;
            _db          = db;
            _env         = env;
        }

        private int InternId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ─── Upload Check-In Photo ───────────────────────────────────────────────────
        /// <summary>
        /// Accepts a multipart photo upload (field name: "photo").
        /// Saves it to wwwroot/uploads/photos/ and returns the public URL.
        /// Call this BEFORE markAttendance to get the URL to include in the request.
        /// </summary>
        [HttpPost("attendance/checkin-photo")]
        [HttpPost("attendance/photo")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadAttendancePhoto(IFormFile photo, [FromQuery] string? type = "checkin")
        {
            if (photo == null || photo.Length == 0)
                return BadRequest(new { message = "No photo file received." });

            // Allow only JPEG/PNG
            var ext = Path.GetExtension(photo.FileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                return BadRequest(new { message = "Only JPEG/PNG photos are accepted." });

            // Save to wwwroot/uploads/photos/<guid>.<ext>
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsDir = Path.Combine(webRoot, "uploads", "photos");
            Directory.CreateDirectory(uploadsDir);

            var fileName  = $"{Guid.NewGuid()}{ext}";
            var filePath  = Path.Combine(uploadsDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await photo.CopyToAsync(stream);

            // Build the public URL
            var request   = HttpContext.Request;
            var photoUrl  = $"{request.Scheme}://{request.Host}/uploads/photos/{fileName}";

            // Persist onto today's AttendanceRecord so failed attempts are immediately recorded
            var isCheckout = string.Equals(type, "checkout", StringComparison.OrdinalIgnoreCase);
            var today = AttendanceAPI.Helpers.PakistanTime.Today;
            var record = await _db.AttendanceRecords.FirstOrDefaultAsync(a => a.UserId == InternId && a.Date == today);
            if (record == null)
            {
                record = new AttendanceRecord
                {
                    UserId = InternId,
                    Date = today,
                    OverallStatus = AttendanceOverallStatus.Absent,
                };
                if (isCheckout) record.CheckOutPhotoUrl = photoUrl;
                else record.CheckInPhotoUrl = photoUrl;

                _db.AttendanceRecords.Add(record);
            }
            else
            {
                if (isCheckout) record.CheckOutPhotoUrl = photoUrl;
                else record.CheckInPhotoUrl = photoUrl;

                record.UpdatedAt = DateTime.UtcNow;
            }
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AttendancePhoto] Note on saving record: {ex.Message}");
            }

            return Ok(new { photoUrl });
        }

        // ─── Mark Attendance (check-in / check-out) ─────────────────────────────────
        [HttpPost("attendance/mark")]
        public async Task<IActionResult> MarkAttendance([FromBody] MarkAttendanceRequest req)
        {
            var (success, message, record) = await _attendance.MarkAttendanceAsync(InternId, req);
            if (!success)
                return BadRequest(new { message });
            return Ok(new { message, record });
        }

        // ─── Intern: Today's status ────────────────────────────────────────────
        [HttpGet("intern/today")]
        public async Task<IActionResult> GetTodayRecord()
        {
            var today  = AttendanceAPI.Helpers.PakistanTime.Today;
            var record = await _db.AttendanceRecords
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.UserId == InternId && a.Date == today);

            if (record == null)
            {
                record = await _db.AttendanceRecords
                    .Where(a => a.UserId == InternId && a.CheckInTime.HasValue && !a.CheckOutTime.HasValue)
                    .OrderByDescending(a => a.Date)
                    .FirstOrDefaultAsync();
            }

            if (record == null)
                return Ok(new { hasRecord = false });

            return Ok(new
            {
                hasRecord         = true,
                checkInTime       = record.CheckInTime,
                checkInStatus     = record.CheckInStatus.ToString(),
                checkOutTime      = record.CheckOutTime,
                checkOutStatus    = record.CheckOutStatus.ToString(),
                overallStatus     = record.OverallStatus.ToString(),
                checkInFace       = record.CheckInFaceVerified,
                checkInGeo        = record.CheckInGeoVerified,
                checkOutFace      = record.CheckOutFaceVerified,
                checkOutGeo       = record.CheckOutGeoVerified
            });
        }

        // ─── Intern: Attendance history ────────────────────────────────────────
        [HttpGet("intern/attendance/history")]
        public async Task<IActionResult> GetHistory()
            => Ok(await _attendance.GetInternHistoryAsync(InternId));

        // ─── Intern: Get my profile with department coords ─────────────────────
        [HttpGet("intern/profile")]
        public async Task<IActionResult> GetProfile()
        {
            var intern = await _db.Users
                .Include(u => u.Department)
                .Include(u => u.Shift)
                .FirstOrDefaultAsync(u => u.Id == InternId);

            if (intern == null) return NotFound();

            return Ok(new
            {
                id             = intern.Id,
                username       = intern.Username,
                firstName      = intern.FirstName,
                lastName       = intern.LastName,
                email          = intern.Email,
                hasFace        = !string.IsNullOrEmpty(intern.FaceDescriptor),
                department     = intern.Department == null ? null : new
                {
                    id           = intern.Department.Id,
                    name         = intern.Department.Name,
                    latitude     = intern.Department.Latitude,
                    longitude    = intern.Department.Longitude,
                    radiusMeters = intern.Department.RadiusMeters
                },
                shift          = intern.Shift == null ? null : new
                {
                    id          = intern.Shift.Id,
                    name        = intern.Shift.Name,
                    description = intern.Shift.Description,
                    checkInStart        = intern.Shift.CheckInStart.ToString("HH:mm"),
                    checkInEnd          = intern.Shift.CheckInEnd.ToString("HH:mm"),
                    checkOutStart       = intern.Shift.CheckOutStart.ToString("HH:mm"),
                    checkOutEnd         = intern.Shift.CheckOutEnd.ToString("HH:mm"),
                    checkOutEarlyBefore = intern.Shift.CheckOutEarlyBefore.ToString("HH:mm")
                }
            });
        }

        // ─── Face Registration ────────────────────────────────────────────────
        [HttpPost("intern/face/register")]
        public async Task<IActionResult> RegisterFace([FromBody] RegisterFaceRequest req)
        {
            var intern = await _db.Users.FindAsync(InternId);
            if (intern == null || intern.Role != UserRole.Intern)
                return NotFound();

            try
            {
                var embedding = _faceService.ExtractEmbedding(req.FaceDescriptor);
                intern.FaceDescriptor = System.Text.Json.JsonSerializer.Serialize(embedding);
            }
            catch (Exception ex)
            {
                // Fallback to storing raw if already an array
                if (req.FaceDescriptor.TrimStart().StartsWith("["))
                {
                    intern.FaceDescriptor = req.FaceDescriptor;
                }
                else
                {
                    return BadRequest(new { message = "Failed to process face image: " + ex.Message });
                }
            }

            intern.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Face registered successfully." });
        }

        // ─── Get own face descriptor (for local re-verification) ──────────────
        [HttpGet("intern/face/descriptor")]
        public async Task<IActionResult> GetFaceDescriptor()
        {
            var intern = await _db.Users.FindAsync(InternId);
            if (intern == null || string.IsNullOrEmpty(intern.FaceDescriptor))
                return NotFound(new { message = "No face registered." });

            return Ok(new GetFaceDescriptorResponse { FaceDescriptor = intern.FaceDescriptor });
        }
    }
}
