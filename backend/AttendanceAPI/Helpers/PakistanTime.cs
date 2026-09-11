namespace AttendanceAPI.Helpers
{
    public static class PakistanTime
    {
        private static readonly TimeZoneInfo _timeZone = ResolveTimeZone();

        private static TimeZoneInfo ResolveTimeZone()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Pakistan Standard Time");
            }
            catch
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById("Asia/Karachi");
                }
                catch
                {
                    return TimeZoneInfo.CreateCustomTimeZone("PKT", TimeSpan.FromHours(5), "Pakistan Standard Time", "PKT");
                }
            }
        }

        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _timeZone);
        public static DateOnly Today => DateOnly.FromDateTime(Now);
        public static TimeOnly TimeNow => TimeOnly.FromDateTime(Now);
    }
}
