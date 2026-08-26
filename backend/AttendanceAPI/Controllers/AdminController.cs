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
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly UserService _users;
        private readonly AppDbContext _db;

        public AdminController(UserService users, AppDbContext db)
        {
            _users = users;
            _db    = db;
        }

        // ─── Mentors ──────────────────────────────────────────────────────────

        [HttpGet("mentors")]
        public async Task<IActionResult> GetMentors()
            => Ok(await _users.GetMentorsAsync());

        [HttpGet("mentors/{id}")]
        public async Task<IActionResult> GetMentor(int id)
        {
            var m = await _users.GetMentorByIdAsync(id);
            return m == null ? NotFound() : Ok(m);
        }

        [HttpPost("mentors")]
        public async Task<IActionResult> CreateMentor([FromBody] CreateMentorRequest req)
        {
            try
            {
                var mentor = await _users.CreateMentorAsync(req);
                return CreatedAtAction(nameof(GetMentor), new { id = mentor.Id }, mentor);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("mentors/{id}")]
        public async Task<IActionResult> UpdateMentor(int id, [FromBody] UpdateMentorRequest req)
        {
            try
            {
                var mentor = await _users.UpdateMentorAsync(id, req);
                return mentor == null ? NotFound() : Ok(mentor);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("mentors/{id}")]
        public async Task<IActionResult> DeleteMentor(int id)
        {
            var ok = await _users.DeleteMentorAsync(id);
            return ok ? NoContent() : NotFound();
        }

        // ─── Departments ──────────────────────────────────────────────────────

        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            var depts = await _db.Departments
                .Select(d => new DepartmentDto
                {
                    Id          = d.Id,
                    Name        = d.Name,
                    Latitude    = d.Latitude,
                    Longitude   = d.Longitude,
                    RadiusMeters = d.RadiusMeters,
                    Description = d.Description
                })
                .ToListAsync();
            return Ok(depts);
        }

        [HttpGet("departments/{id}")]
        public async Task<IActionResult> GetDepartment(int id)
        {
            var d = await _db.Departments.FindAsync(id);
            if (d == null) return NotFound();
            return Ok(new DepartmentDto
            {
                Id = d.Id, Name = d.Name,
                Latitude = d.Latitude, Longitude = d.Longitude,
                RadiusMeters = d.RadiusMeters, Description = d.Description
            });
        }

        [HttpPost("departments")]
        public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentRequest req)
        {
            var dept = new Department
            {
                Name        = req.Name,
                Latitude    = req.Latitude,
                Longitude   = req.Longitude,
                RadiusMeters = req.RadiusMeters,
                Description = req.Description,
                CreatedAt   = DateTime.UtcNow,
                UpdatedAt   = DateTime.UtcNow
            };
            _db.Departments.Add(dept);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetDepartment), new { id = dept.Id }, new DepartmentDto
            {
                Id = dept.Id, Name = dept.Name, Latitude = dept.Latitude,
                Longitude = dept.Longitude, RadiusMeters = dept.RadiusMeters,
                Description = dept.Description
            });
        }

        [HttpPut("departments/{id}")]
        public async Task<IActionResult> UpdateDepartment(int id, [FromBody] CreateDepartmentRequest req)
        {
            var dept = await _db.Departments.FindAsync(id);
            if (dept == null) return NotFound();

            dept.Name        = req.Name;
            dept.Latitude    = req.Latitude;
            dept.Longitude   = req.Longitude;
            dept.RadiusMeters = req.RadiusMeters;
            dept.Description = req.Description;
            dept.UpdatedAt   = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new DepartmentDto
            {
                Id = dept.Id, Name = dept.Name, Latitude = dept.Latitude,
                Longitude = dept.Longitude, RadiusMeters = dept.RadiusMeters,
                Description = dept.Description
            });
        }

        [HttpDelete("departments/{id}")]
        public async Task<IActionResult> DeleteDepartment(int id)
        {
            var dept = await _db.Departments.FindAsync(id);
            if (dept == null) return NotFound();
            _db.Departments.Remove(dept);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ─── Shifts (read-only for admin) ─────────────────────────────────────
        [HttpGet("shifts")]
        public async Task<IActionResult> GetShifts()
        {
            var shifts = await _db.Shifts
                .Select(s => new ShiftDto { Id = s.Id, Name = s.Name, Description = s.Description ?? "" })
                .ToListAsync();
            return Ok(shifts);
        }
    }
}
