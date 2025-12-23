# Running SnapGram with Video Spaces

> [!WARNING]
> **You cannot use the standard Expo Go app** from the App Store/Play Store for this project.
> This project uses `@livekit/react-native` (native WebRTC), which requires custom native code that is not included in the standard Expo Go app.

## Option 1: Development Build (Recommended)
This creates a custom version of "Expo Go" installed on your device that includes your native libraries.

1. **Install EAS CLI** (if not installed):
   ```powershell
   npm install -g eas-cli
   ```

2. **Build for your device**:
   - **Android** (APK for emulator or device):
     ```powershell
     eas build --profile development --platform android --local
     ```
     (Or remove `--local` to build in the cloud)
   
   - **iOS** (Requires Apple Developer Account):
     ```powershell
     eas build --profile development --platform ios
     ```

3. **Install the build** on your device.

4. **Start the development server**:
   ```powershell
   npx expo start --dev-client
   ```
   Scan the QR code using your camera (iOS) or the custom app you just installed (Android).

## Option 2: Local Native Run (If you have Android Studio/Xcode)
If you have android Studio configured on this Windows machine:

1. **Run on Android Emulator/Device**:
   ```powershell
   npx expo run:android
   ```
   This will compile the native app locally and launch it.

## Why?
The standard Expo Go app only contains a fixed set of native libraries. Features like **Background Location**, **Bluetooth**, and **LiveKit WebRTC** require changing the native code, which requires a "Prebuild" or "Development Build".
