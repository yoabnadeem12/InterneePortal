# 📋 PIA Intern Attendance Management System

A robust, enterprise-grade Intern Attendance and Management System with **Deep Learning Face Verification**, **Passive Anti-Spoofing (MiniFASNetV2)**, **Active Liveness Gesture Challenges**, **GPS Geofencing (Haversine Distance)**, and **Automated Gmail Credential Dispatch**.

---

## 🌟 Key Features

- **🛡️ Role-Based Access Control (RBAC)**:
  - **Admin**: Manage Departments, Geofences (lat/long/radius), Shifts, and Mentor Accounts.
  - **Mentor**: Manage Interns, create student accounts with auto-generated credentials, Transfer Interns across Departments/Mentors, and view Attendance Reports.
  - **Intern**: Face Registration, Geo-verified & Face-verified Check-in / Check-out, and Attendance History.
- **🤖 Dual-Layer Face AI Pipeline**:
  - **Google ML Kit** (Mobile Edge): Active liveness challenges (blinking, head turns, smiling).
  - **UltraFace ONNX (RFB-320)**: Pixel-accurate face detection and bounding box cropping.
  - **MiniFASNetV2 ONNX**: Passive anti-spoofing neural network detecting 2D photo prints and screen replays.
  - **FaceNet / ArcFace ONNX**: 512-dimensional deep residual feature embedding extraction with Cosine Distance thresholding ($\le 0.58$).
- **📍 GPS Geofencing**:
  - Haversine geodesic distance formula calculating real-time proximity to department coordinates.
- **✉️ Automated Credential Dispatch**:
  - Auto-generates serial username (`firstname.PIA.###`) and secure temporary password.
  - Asynchronously dispatches a branded HTML email to the student's Gmail via Google SMTP.
- **🔐 First-Time Password Reset Flow**:
  - Enforces mandatory permanent password creation upon initial student login.
- **🔁 Intern Transfer Workflow**:
  - Enables mentors to seamlessly transfer interns by selecting target departments and dynamically filtering mentors within that department.

---

## 🏗️ Architecture & Technology Stack

- **Backend**: ASP.NET Core 8.0 Web API, Entity Framework Core, SQL Server
- **AI / Inference**: Microsoft.ML.OnnxRuntime (ArcFace, UltraFace, MiniFASNetV2)
- **Mobile Client**: React Native, React Native Paper, React Navigation, React Native Vision Camera, Google ML Kit Face Detection
- **Authentication**: JWT (HMAC-SHA256), BCrypt.Net Password Hashing
- **Email Service**: Google Gmail SMTP (`smtp.gmail.com:587`)

---

## 🚀 Setup & Getting Started

### 1. Backend Setup
1. Navigate to `backend/AttendanceAPI`.
2. Configure database connection string in `appsettings.json`.
3. Set your Gmail credentials in `appsettings.json`:
   ```json
   "SmtpSettings": {
     "Host": "smtp.gmail.com",
     "Port": 587,
     "SenderEmail": "your-email@gmail.com",
     "Password": "your-app-password",
     "EnableSsl": true
   }
   ```
4. Run the API:
   ```bash
   dotnet run
   ```
   API will listen on `http://localhost:5000` (Swagger UI at `/swagger`).

### 2. Mobile App Setup
1. Navigate to `mobile/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Reverse port 5000 to your connected Android device:
   ```bash
   adb reverse tcp:5000 tcp:5000
   ```
4. Start Metro & launch Android app:
   ```bash
   npm start
   npm run android
   ```

---

## 🔑 Default Admin Account
- **Username**: `admin`
- **Password**: `Admin@123`
