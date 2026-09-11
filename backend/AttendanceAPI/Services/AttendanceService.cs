using AttendanceAPI.Data;
using AttendanceAPI.DTOs;
using AttendanceAPI.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AttendanceAPI.Services
{
    public class AttendanceService
    {
        private readonly AppDbContext _db;
        private readonly FaceRecognitionService _faceService;

        public AttendanceService(AppDbContext db, FaceRecognitionService faceService)
        {
            _db = db;
            _faceService = faceService;
        }

        /// <summary>
        /// Marks check-in or check-out attendance after face + geo verification.
        /// </summary>
        public async Task<(bool Success, string Message, AttendanceRecordDto? Record)>
            MarkAttendanceAsync(int userId, MarkAttendanceRequest req)
        {
            // 1. Load the intern with shift and department
            var intern = await _db.Users
                .Include(u => u.Shift)
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.Id == userId && u.Role == UserRole.Intern && u.IsActive);

            if (intern == null)
                return (false, "Intern not found.", null);

            if (intern.Shift == null)
                return (false, "Intern has no shift assigned.", null);

            if (intern.Department == null)
                return (false, "Intern has no department assigned.", null);

            if (string.IsNullOrEmpty(intern.FaceDescriptor))
                return (false, "Face not registered. Please register face first.", null);

            // 1b. Persist photo URL before any verification (captures failed attempts too)
            var photoToPersist = req.PhotoUrl ?? (req.Type == "checkout" ? req.CheckOutPhotoUrl : req.CheckInPhotoUrl);
            if (!string.IsNullOrEmpty(photoToPersist))
            {
                var photoToday = AttendanceAPI.Helpers.PakistanTime.Today;
                var photoRecord = await _db.AttendanceRecords
                    .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == photoToday);

                if (photoRecord == null)
                {
                    photoRecord = new AttendanceRecord
                    {
                        UserId        = userId,
                        Date          = photoToday,
                        OverallStatus = AttendanceOverallStatus.Absent
                    };
                    _db.AttendanceRecords.Add(photoRecord);
                }

                if (req.Type == "checkout")
                    photoRecord.CheckOutPhotoUrl = photoToPersist;
                else
                    photoRecord.CheckInPhotoUrl = photoToPersist;

                photoRecord.UpdatedAt = DateTime.UtcNow;

                try { await _db.SaveChangesAsync(); }
                catch { /* Ignore if record already exists due to race condition */ }
            }

            // 2. Active Liveness Challenge Check
            if (!req.LivenessPassed)
            {
                Console.WriteLine($"[Audit Log] Intern: {intern.Username} | Challenge: {req.LivenessChallenge ?? "None"} | Result: RejectedChallenge");
                return (false, "Liveness challenge failed: Required live motion was not performed.", null);
            }

            // 3. Passive Anti-Spoofing AI Check (MiniFASNetV2)
            var (isReal, spoofScore) = _faceService.CheckAntiSpoof(req.FaceDescriptor);
            if (!isReal)
            {
                Console.WriteLine($"[Audit Log] Intern: {intern.Username} | SpoofScore: {spoofScore:F3} | Result: RejectedSpoof (Photo/Screen replay detected)");
                return (false, "Anti-Spoofing Alert: A static photo or screen replay was detected. Please use your live face in the camera.", null);
            }

            // 4. Deep Face Verification with ArcFace ONNX
            bool faceVerified = false;
            double faceDistance = 1.0;
            double faceSim = 0.0;
            try
            {
                var liveEmb = _faceService.ExtractEmbedding(req.FaceDescriptor);
                var storedEmb = _faceService.ExtractEmbedding(intern.FaceDescriptor);
                var (isMatch, dist, sim) = _faceService.Compare(storedEmb, liveEmb);
                faceVerified = isMatch;
                faceDistance = dist;
                faceSim = sim;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FaceNet AI] Error: {ex.Message}, falling back to legacy comparison");
                faceVerified = VerifyFace(intern.FaceDescriptor, req.FaceDescriptor);
            }

            if (!faceVerified)
            {
                Console.WriteLine($"[Audit Log] Intern: {intern.Username} | FaceDist: {faceDistance:F3} | Sim: {faceSim:F3} | Result: RejectedFaceMismatch");
                return (false, $"Face mismatch (distance: {faceDistance:F3}): Face does not match the registered user profile.", null);
            }

            // 5. Geo verification (Haversine distance)
            bool geoVerified = VerifyGeo(
                intern.Department.Latitude, intern.Department.Longitude,
                req.Latitude, req.Longitude,
                intern.Department.RadiusMeters);

            if (!geoVerified)
            {
                Console.WriteLine($"[Audit Log] Intern: {intern.Username} | GeoPassed: False | Result: RejectedGeo");
                return (false, $"You are not within {intern.Department.RadiusMeters}m of your department location.", null);
            }

            Console.WriteLine($"[Audit Log] Intern: {intern.Username} | Challenge: {req.LivenessChallenge ?? "Completed"} | SpoofScore: {spoofScore:F3} | FaceDist: {faceDistance:F3} | Geo: OK | Result: Approved");

            // 4. Get attendance record for check-in / check-out
            var today   = AttendanceAPI.Helpers.PakistanTime.Today;
            var now     = AttendanceAPI.Helpers.PakistanTime.Now;
            var timeNow = AttendanceAPI.Helpers.PakistanTime.TimeNow;
            var shift   = intern.Shift;
            AttendanceRecord? record;

            if (req.Type == "checkout")
            {
                // Find today's record with check-in, or most recent incomplete record
                record = await _db.AttendanceRecords
                    .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today && a.CheckInTime.HasValue);

                if (record == null)
                {
                    record = await _db.AttendanceRecords
                        .Where(a => a.UserId == userId && a.CheckInTime.HasValue && !a.CheckOutTime.HasValue)
                        .OrderByDescending(a => a.Date)
                        .FirstOrDefaultAsync();
                }

                if (record == null || !record.CheckInTime.HasValue)
                    return (false, "Please check in first before checking out.", null);

                if (record.CheckOutTime.HasValue)
                    return (false, "Already checked out today.", null);

                var outPhoto = req.CheckOutPhotoUrl ?? req.PhotoUrl ?? req.CheckInPhotoUrl;
                if (!string.IsNullOrEmpty(outPhoto))
                    record.CheckOutPhotoUrl = outPhoto;

                record.CheckOutTime         = now;
                record.CheckOutFaceVerified = true;
                record.CheckOutGeoVerified  = true;
                record.CheckOutLatitude     = req.Latitude;
                record.CheckOutLongitude    = req.Longitude;

                // Determine check-out status
                if (timeNow < shift.CheckOutStart)
                    record.CheckOutStatus = CheckOutStatus.Early;
                else if (timeNow >= shift.CheckOutStart && timeNow <= shift.CheckOutEnd)
                    record.CheckOutStatus = CheckOutStatus.OnTime;
                else
                    record.CheckOutStatus = CheckOutStatus.Late;

                record.OverallStatus = AttendanceOverallStatus.Present;
            }
            else if (req.Type == "checkin")
            {
                record = await _db.AttendanceRecords
                    .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);

                if (record == null)
                {
                    record = new AttendanceRecord
                    {
                        UserId        = userId,
                        Date          = today,
                        OverallStatus = AttendanceOverallStatus.Absent
                    };
                    _db.AttendanceRecords.Add(record);
                }

                // Always update the photo URL on every attempt (failed or successful)
                // so the mentor always sees who physically stood in front of the camera.
                var inPhoto = req.CheckInPhotoUrl ?? req.PhotoUrl;
                if (!string.IsNullOrEmpty(inPhoto))
                    record.CheckInPhotoUrl = inPhoto;

                if (record.CheckInTime.HasValue)
                    return (false, "Already checked in today.", null);

                record.CheckInTime         = now;
                record.CheckInFaceVerified = true;
                record.CheckInGeoVerified  = true;
                record.CheckInLatitude     = req.Latitude;
                record.CheckInLongitude    = req.Longitude;

                // Determine check-in status
                if (timeNow < shift.CheckInStart)
                    record.CheckInStatus = CheckInStatus.Early;
                else if (timeNow >= shift.CheckInStart && timeNow <= shift.CheckInEnd)
                    record.CheckInStatus = CheckInStatus.OnTime;
                else
                    record.CheckInStatus = CheckInStatus.Late;

                record.OverallStatus = AttendanceOverallStatus.Incomplete;
            }
            else
            {
                return (false, "Invalid attendance type. Use 'checkin' or 'checkout'.", null);
            }

            record.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await _db.Entry(record).Reference(r => r.User).LoadAsync();
            return (true, "Attendance marked successfully.", MapToDto(record));
        }

        public async Task<List<AttendanceRecordDto>> GetInternHistoryAsync(int userId)
        {
            var records = await _db.AttendanceRecords
                .Where(a => a.UserId == userId)
                .Include(a => a.User)
                .OrderByDescending(a => a.Date)
                .ToListAsync();
            return records.Select(MapToDto).ToList();
        }

        public async Task<List<AttendanceRecordDto>> GetAttendanceByMentorAsync(int mentorId, DateOnly? date)
        {
            var query = _db.AttendanceRecords
                .Include(a => a.User)
                .Where(a => a.User.MentorId == mentorId && a.User.Role == UserRole.Intern);

            if (date.HasValue)
                query = query.Where(a => a.Date == date.Value);

            // Materialise first so MapToDto (a static C# method) runs in-memory.
            // This ensures CheckInPhotoUrl and all other fields are correctly populated.
            var records = await query
                .OrderByDescending(a => a.Date)
                .ThenBy(a => a.User.FirstName)
                .ToListAsync();

            return records.Select(MapToDto).ToList();
        }

        // ─── Face Verification ────────────────────────────────────────────────

        /// <summary>
        /// Compares two 512-D face embeddings using cosine similarity.
        /// Returns true if the cosine distance is within the threshold.
        ///
        /// MobileFaceNet characteristics:
        ///   - Genuine pairs (same person):   cosine distance typically 0.2 – 0.55
        ///   - Impostor pairs (diff. person): cosine distance typically 0.7 – 1.5
        ///   - Threshold 0.60 gives good accuracy at FAR ≈ 0.1%
        /// </summary>
        private static bool VerifyFace(string storedDescJson, string inputDescJson)
        {
            try
            {
                var stored = JsonSerializer.Deserialize<float[]>(storedDescJson);
                var input  = JsonSerializer.Deserialize<float[]>(inputDescJson);

                if (stored == null || input == null || stored.Length != input.Length)
                    return false;

                double cosineSimilarity = CosineSimilarity(stored, input);
                double cosineDistance   = 1.0 - cosineSimilarity;
                return cosineDistance < 0.60;
            }
            catch
            {
                return false;
            }
        }

        private static double CosineSimilarity(float[] a, float[] b)
        {
            double dot = 0, normA = 0, normB = 0;
            for (int i = 0; i < a.Length; i++)
            {
                dot  += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.Sqrt(normA) * Math.Sqrt(normB) + 1e-10);
        }

        // ─── Geo Verification ─────────────────────────────────────────────────

        private static bool VerifyGeo(double deptLat, double deptLng,
                                       double userLat, double userLng,
                                       double radiusMeters)
        {
            double distance = Haversine(deptLat, deptLng, userLat, userLng);
            return distance <= radiusMeters;
        }

        /// <summary>Haversine formula — returns distance in meters.</summary>
        private static double Haversine(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000; // Earth radius in meters
            double φ1 = lat1 * Math.PI / 180;
            double φ2 = lat2 * Math.PI / 180;
            double Δφ = (lat2 - lat1) * Math.PI / 180;
            double Δλ = (lon2 - lon1) * Math.PI / 180;

            double a = Math.Sin(Δφ / 2) * Math.Sin(Δφ / 2)
                     + Math.Cos(φ1) * Math.Cos(φ2)
                     * Math.Sin(Δλ / 2) * Math.Sin(Δλ / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        // ─── Mapper ───────────────────────────────────────────────────────────

        private static AttendanceRecordDto MapToDto(AttendanceRecord a) => new()
        {
            Id                  = a.Id,
            UserId              = a.UserId,
            InternName          = $"{a.User.FirstName} {a.User.LastName}",
            InternUsername      = a.User.Username,
            Date                = a.Date.ToString("yyyy-MM-dd"),
            CheckInTime         = a.CheckInTime,
            CheckInStatus       = a.CheckInStatus.ToString(),
            CheckOutTime        = a.CheckOutTime,
            CheckOutStatus      = a.CheckOutStatus.ToString(),
            OverallStatus       = a.OverallStatus.ToString(),
            CheckInFaceVerified = a.CheckInFaceVerified,
            CheckInGeoVerified  = a.CheckInGeoVerified,
            CheckOutFaceVerified = a.CheckOutFaceVerified,
            CheckOutGeoVerified = a.CheckOutGeoVerified,
            CheckInPhotoUrl     = a.CheckInPhotoUrl,
            CheckOutPhotoUrl    = a.CheckOutPhotoUrl
        };
    }
}
