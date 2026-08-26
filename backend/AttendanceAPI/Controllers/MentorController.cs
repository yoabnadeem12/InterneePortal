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
    [Route("api/mentor")]
    [Authorize(Roles = "Mentor")]
    public class MentorController : ControllerBase
    {
        private readonly UserService _users;
        private readonly AttendanceService _attendance;
        private readonly AppDbContext _db;

        public MentorController(UserService users, AttendanceService attendance, AppDbContext db)
        {
            _users      = users;
            _attendance = attendance;
            _db         = db;
        }

        private int MentorId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ─── Interns ──────────────────────────────────────────────────────────

        [HttpGet("interns")]
        public async Task<IActionResult> GetInterns()
            => Ok(await _users.GetInternsByMentorAsync(MentorId));

        [HttpGet("interns/{id}")]
        public async Task<IActionResult> GetIntern(int id)
        {
            var i = await _users.GetInternByIdAsync(id);
            if (i == null || i.MentorId != MentorId) return NotFound();
            return Ok(i);
        }

        [HttpPost("interns")]
        public async Task<IActionResult> CreateIntern([FromBody] CreateInternRequest req)
        {
            try
            {
                var intern = await _users.CreateInternAsync(MentorId, req);
                return CreatedAtAction(nameof(GetIntern), new { id = intern.Id }, intern);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("interns/{id}")]
        public async Task<IActionResult> UpdateIntern(int id, [FromBody] UpdateInternRequest req)
        {
            try
            {
                var intern = await _users.UpdateInternAsync(id, MentorId, req);
                return intern == null ? NotFound() : Ok(intern);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("interns/{id}")]
        public async Task<IActionResult> DeleteIntern(int id)
        {
            var ok = await _users.DeleteInternAsync(id, MentorId);
            return ok ? NoContent() : NotFound();
        }

        // ─── Attendance Reports ───────────────────────────────────────────────

        [HttpGet("attendance")]
        public async Task<IActionResult> GetAttendance([FromQuery] string? date)
        {
            DateOnly? dateFilter = null;
            if (!string.IsNullOrEmpty(date) && DateOnly.TryParse(date, out var d))
                dateFilter = d;

            var records = await _attendance.GetAttendanceByMentorAsync(MentorId, dateFilter);
            return Ok(records);
        }

        // ─── Shifts (for creating interns) ────────────────────────────────────
        [HttpGet("shifts")]
        public async Task<IActionResult> GetShifts()
        {
            var shifts = await _db.Shifts
                .Select(s => new ShiftDto { Id = s.Id, Name = s.Name, Description = s.Description ?? "" })
                .ToListAsync();
            return Ok(shifts);
        }

        // ─── Departments (for creating/transferring interns) ───────────────────
        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            var depts = await _db.Departments
                .Select(d => new DepartmentDto
                {
                    Id = d.Id, Name = d.Name, Latitude = d.Latitude,
                    Longitude = d.Longitude, RadiusMeters = d.RadiusMeters
                })
                .ToListAsync();
            return Ok(depts);
        }

        // ─── Mentors by Department (for transferring interns) ─────────────────
        [HttpGet("departments/{deptId}/mentors")]
        public async Task<IActionResult> GetMentorsByDepartment(int deptId)
        {
            var mentors = await _db.Users
                .Where(u => u.Role == UserRole.Mentor && u.DepartmentId == deptId && u.IsActive)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Username = u.Username,
                    Email = u.Email,
                    DepartmentId = u.DepartmentId,
                    DepartmentName = u.Department != null ? u.Department.Name : null,
                    IsActive = u.IsActive
                })
                .ToListAsync();
            return Ok(mentors);
        }

        // ─── Transfer Intern ──────────────────────────────────────────────────
        [HttpPost("interns/{id}/transfer")]
        public async Task<IActionResult> TransferIntern(int id, [FromBody] TransferInternRequest req)
        {
            try
            {
                var intern = await _users.TransferInternAsync(id, MentorId, req.DepartmentId, req.MentorId);
                return intern == null ? NotFound(new { message = "Intern not found or not assigned to you." }) : Ok(intern);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
