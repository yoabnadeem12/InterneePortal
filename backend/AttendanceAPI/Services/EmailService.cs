using System.Net;
using System.Net.Mail;

namespace AttendanceAPI.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        /// <summary>
        /// Sends intern account login credentials to their Gmail address asynchronously.
        /// </summary>
        public async Task<bool> SendCredentialsEmailAsync(string toEmail, string fullName, string username, string password, string? departmentName = null, string? shiftName = null)
        {
            if (string.IsNullOrWhiteSpace(toEmail)) return false;

            try
            {
                var smtp = _config.GetSection("SmtpSettings");
                var host = smtp["Host"] ?? "smtp.gmail.com";
                var port = int.Parse(smtp["Port"] ?? "587");
                var senderEmail = smtp["SenderEmail"];
                var senderName = smtp["SenderName"] ?? "PIA Attendance Portal";
                var appPassword = smtp["Password"]?.Replace(" ", ""); // remove any spaces

                if (string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(appPassword))
                {
                    _logger.LogWarning("SMTP sender credentials are not configured in appsettings.json.");
                    return false;
                }

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(senderEmail, appPassword),
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    UseDefaultCredentials = false,
                    Timeout = 15000 // 15 seconds timeout
                };

                var deptInfo = !string.IsNullOrEmpty(departmentName) ? $"<p style='margin: 4px 0; color: #555;'><b>Department:</b> {departmentName}</p>" : "";
                var shiftInfo = !string.IsNullOrEmpty(shiftName) ? $"<p style='margin: 4px 0; color: #555;'><b>Shift:</b> {shiftName}</p>" : "";

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = "🎓 Welcome to PIA Internship - Your Account Credentials",
                    IsBodyHtml = true,
                    Body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Account Credentials</title>
</head>
<body style='font-family: Arial, Helvetica, sans-serif; background-color: #0D0E1A; margin: 0; padding: 20px;'>
    <div style='max-width: 540px; margin: 0 auto; background-color: #13152A; border: 1px solid #2A2C45; border-radius: 16px; overflow: hidden; color: #E8EAF6;'>
        <!-- Header -->
        <div style='background: linear-gradient(135deg, #6C63FF, #4834DF); padding: 28px 20px; text-align: center;'>
            <h1 style='margin: 0; color: #FFFFFF; font-size: 22px; letter-spacing: 0.5px;'>📋 PIA Intern Attendance</h1>
            <p style='margin: 6px 0 0 0; color: #E0E0FF; font-size: 13px;'>Intern Management System</p>
        </div>
        
        <!-- Content -->
        <div style='padding: 28px 24px;'>
            <p style='font-size: 16px; color: #E8EAF6; margin-top: 0;'>Dear <b>{fullName}</b>,</p>
            <p style='font-size: 14px; color: #A0A3BD; line-height: 1.6;'>
                Your intern account has been successfully created. You can now log into the mobile application using your credentials below:
            </p>
            
            <!-- Credentials Box -->
            <div style='background-color: #1A1C33; border: 1px solid #6C63FF44; border-radius: 12px; padding: 18px 20px; margin: 22px 0;'>
                <div style='margin-bottom: 12px;'>
                    <span style='font-size: 11px; text-transform: uppercase; color: #6C63FF; font-weight: bold; letter-spacing: 1px;'>Username</span>
                    <div style='font-size: 17px; font-weight: bold; color: #FFFFFF; font-family: monospace; margin-top: 2px;'>{username}</div>
                </div>
                <div>
                    <span style='font-size: 11px; text-transform: uppercase; color: #6C63FF; font-weight: bold; letter-spacing: 1px;'>Temporary Password</span>
                    <div style='font-size: 17px; font-weight: bold; color: #FFD700; font-family: monospace; margin-top: 2px;'>{password}</div>
                </div>
                {deptInfo}
                {shiftInfo}
            </div>

            <!-- Steps -->
            <h3 style='color: #FFFFFF; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;'>First-Time Login Steps:</h3>
            <ol style='color: #A0A3BD; font-size: 13px; line-height: 1.7; padding-left: 20px; margin-top: 0;'>
                <li>Open the <b>PIA Attendance App</b> on your mobile phone.</li>
                <li>Sign in with your <b>Username</b> and the <b>Temporary Password</b> above.</li>
                <li>You will be prompted immediately to <b>create your own secure password</b>.</li>
                <li>Complete your <b>Face Registration</b> before your first attendance check-in.</li>
            </ol>

            <hr style='border: none; border-top: 1px solid #2A2C45; margin: 24px 0;' />
            
            <p style='font-size: 11px; color: #6B6D8A; text-align: center; margin: 0;'>
                This is an automated system notification. Please keep your credentials secure.
            </p>
        </div>
    </div>
</body>
</html>"
                };

                mailMessage.To.Add(toEmail);
                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Credentials email sent successfully to {Email} for username {Username}", toEmail, username);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send credentials email to {Email}", toEmail);
                return false;
            }
        }
    }
}
