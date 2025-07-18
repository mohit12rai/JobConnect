# JobConnector Mobile App

A React Native mobile application built with Expo, designed to replicate the functionality of the JobConnector web application. This project currently features a minimal Home page as a starting point, with plans to expand to include authentication, registration, profiles, and dashboards.

## Project Overview

- **Goal**: Create a mobile version of the JobConnector web app with a simple Home page displaying "JobConnector Mobile".
- **Tech Stack**: Expo SDK 52, React Native, EAS Build.
- **Status**: Initial setup with a single Home page, tested in Expo Go and as an APK.

## Directory Structure

mobileapp/
├── assets/              # App assets (icon.png, splash.png, adaptive-icon.png)
├── pages/               # Screen components
│   └── Home.js          # Home page component
├── App.js               # Main app entry point
├── app.json             # Expo configuration
├── eas.json             # EAS build configuration
├── package.json         # Dependencies and scripts
└── README.md            # Project documentation

text
Wrap
Copy

## Prerequisites

- **Node.js**: LTS version (e.g., 20.x) installed.
- **Expo CLI**: `npm install -g expo-cli`.
- **EAS CLI**: `npm install -g eas-cli`.
- **ADB**: Android SDK Platform Tools added to PATH for debugging.
- **Android Device**: USB Debugging enabled for APK testing.

## Setup Instructions

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/jobconnector-mobile.git
cd jobconnector-mobile
Step 2: Install Dependencies
bash
Wrap
Copy
npm install
Ensure node_modules is clean:
bash
Wrap
Copy
rm -rf node_modules package-lock.json
npm install
Step 3: Verify Setup with Expo Doctor
bash
Wrap
Copy
npx expo-doctor
Resolve any dependency warnings (e.g., version mismatches).
Step 4: Add Assets
Place the following in assets/:
icon.png (512x512)
splash.png (1242x2436)
adaptive-icon.png (432x432)
Use placeholder images (e.g., solid color PNGs) if needed.
Running the App
Development Mode (Expo Go)
Start the app:
bash
Wrap
Copy
npx expo start --clear
Scan the QR code with Expo Go on your Android device.
Expected output: "JobConnector Mobile" displayed on screen.
Production Mode (Local Test)
bash
Wrap
Copy
npx expo start --no-dev --minify
Test in Expo Go to simulate production behavior.
Building and Testing the APK
Step 1: Configure EAS
bash
Wrap
Copy
eas login
eas project:init
Use slug jobconnector and update app.json with the generated projectId if needed:
json
Wrap
Copy
"extra": {
  "eas": {
    "projectId": "your-project-id"
  }
}
Step 2: Build APK
bash
Wrap
Copy
eas build --platform android --profile preview
Monitor build status on expo.dev.
Download the APK from the dashboard.
Step 3: Install and Test APK
Install via ADB:
bash
Wrap
Copy
adb install path/to/your/apk.apk
Open the app on your Android device.
Expected output: "JobConnector Mobile" displayed.
Debug if needed:
bash
Wrap
Copy
adb logcat *:E
Troubleshooting
Build Fails
Check Logs: Review "Prebuild" phase logs on Expo dashboard for errors (e.g., missing assets, plugin issues).
Fix: Update app.json, ensure assets exist, and reinstall dependencies:
bash
Wrap
Copy
rm -rf node_modules package-lock.json
npm install
APK Shows Blank Screen or Crashes
Debug: Capture logs with adb logcat *:E and check for Error caught messages.
Test Minimal: Simplify App.js:
javascript
Wrap
Copy
export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ color: '#000', fontSize: 20 }}>Hello, JobConnector!</Text>
    </View>
  );
}
Rebuild: Repeat build steps and test.
Contributing
Fork the repository.
Create a branch (git checkout -b feature/your-feature).
Commit changes (git commit -m "Add your feature").
Push to branch (git push origin feature/your-feature).
Open a Pull Request.

git remote add origin https://github.com/your-username/jobconnector-mobile.git
git branch -M main
git push -u origin main
