using AttendanceAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace AttendanceAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<Shift> Shifts { get; set; }
        public DbSet<AttendanceRecord> AttendanceRecords { get; set; }
        public DbSet<InternSerialTracker> InternSerialTrackers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Self-referencing User (Intern → Mentor)
            modelBuilder.Entity<User>()
                .HasOne(u => u.Mentor)
                .WithMany(u => u.Interns)
                .HasForeignKey(u => u.MentorId)
                .OnDelete(DeleteBehavior.Restrict);

            // User → Department
            modelBuilder.Entity<User>()
                .HasOne(u => u.Department)
                .WithMany(d => d.Users)
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceRecord → User
            modelBuilder.Entity<AttendanceRecord>()
                .HasOne(a => a.User)
                .WithMany(u => u.AttendanceRecords)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique index on attendance (one per intern per day)
            modelBuilder.Entity<AttendanceRecord>()
                .HasIndex(a => new { a.UserId, a.Date })
                .IsUnique();

            // Seed Shifts
            modelBuilder.Entity<Shift>().HasData(
                new Shift
                {
                    Id = 1,
                    Name = "Shift 1 - Morning",
                    CheckInEarlyBefore  = new TimeOnly(9, 0),
                    CheckInStart        = new TimeOnly(9, 0),
                    CheckInEnd          = new TimeOnly(9, 15),
                    CheckOutStart       = new TimeOnly(16, 0),
                    CheckOutEnd         = new TimeOnly(16, 15),
                    CheckOutEarlyBefore = new TimeOnly(16, 0),
                    Description         = "9:00 AM - 4:00 PM"
                },
                new Shift
                {
                    Id = 2,
                    Name = "Shift 2 - Afternoon",
                    CheckInEarlyBefore  = new TimeOnly(10, 0),
                    CheckInStart        = new TimeOnly(10, 0),
                    CheckInEnd          = new TimeOnly(10, 15),
                    CheckOutStart       = new TimeOnly(17, 0),
                    CheckOutEnd         = new TimeOnly(17, 15),
                    CheckOutEarlyBefore = new TimeOnly(17, 0),
                    Description         = "10:00 AM - 5:00 PM"
                }
            );

            // Seed InternSerialTracker
            modelBuilder.Entity<InternSerialTracker>().HasData(
                new InternSerialTracker { Id = 1, LastSerial = 0 }
            );

            // Seed Admin user (password: Admin@123)
            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id           = 1,
                    Username     = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    Role         = UserRole.Admin,
                    FirstName    = "System",
                    LastName     = "Admin",
                    IsActive     = true,
                    CreatedAt    = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    UpdatedAt    = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );
        }
    }
}
