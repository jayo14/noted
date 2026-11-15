# Android Packaging Guide (APK & AAB)

This guide covers building, signing, and installing **Noted** as a native **Android application (`.apk` / `.aab`)** using Tauri v2 mobile and Gradle.

---

## Android Packaging Matrix

| Target Format | File Extension | Primary Use Case | Output Path |
| :--- | :--- | :--- | :--- |
| **Universal APK** | `.apk` | Sideloading, GitHub Releases, direct phone install | `src-tauri/gen/android/app/build/outputs/apk/universal/` |
| **Architecture APK** | `.apk` | Device-specific optimization (`arm64-v8a`, `x86_64`) | `src-tauri/gen/android/app/build/outputs/apk/{arch}/` |
| **Android App Bundle** | `.aab` | Google Play Store distribution | `src-tauri/gen/android/app/build/outputs/bundle/` |

---

## 1. Local Prerequisites & Environment Setup

To compile and build Android APKs locally on your development machine:

### A. Java Development Kit (JDK 17)
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y openjdk-17-jdk

# Verify Java version
java -version
```

### B. Android SDK & NDK
1. Install [Android Studio](https://developer.android.com/studio) or command-line tools.
2. In Android Studio SDK Manager, install:
   - **Android SDK Platform 34** (or higher)
   - **Android SDK Build-Tools 34.0.0** (or higher)
   - **NDK (Side by side)** version `26.1.10909125`
   - **Android SDK Command-line Tools (latest)**

3. Set required environment variables (e.g. in `~/.bashrc` or `~/.zshrc`):
   ```bash
   export ANDROID_HOME="$HOME/Android/Sdk"
   export NDK_HOME="$ANDROID_HOME/ndk/26.1.10909125"
   export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
   ```

### C. Rust Mobile Compilation Targets
Add the Android architectures via rustup:
```bash
rustup target add aarch64-linux-android x86_64-linux-android armv7-linux-androideabi i686-linux-android
```

---

## 2. Building the Android APK

Noted includes dedicated packaging scripts in `package.json`:

```bash
# Build universal and architecture-specific release APKs
pnpm package:android
# or
pnpm package:apk

# Build Google Play Android App Bundle (.aab)
pnpm package:aab
```

### Targeted Architecture Build
To speed up local development and compile only for your connected device (e.g. modern 64-bit ARM phone):
```bash
pnpm tauri android build --apk --target aarch64
```

---

## 3. Signing Release APKs for Distribution

Noted is configured to **automatically sign release APKs and bundles** during local and CI/CD builds via `src-tauri/gen/android/app/build.gradle.kts`.

### A. Keystore Configuration
The project includes a release keystore located at:
`src-tauri/gen/android/app/noted-release.jks`

Build environment parameters (configured locally or via GitHub Secrets):
- **Keystore Path**: `src-tauri/gen/android/app/noted-release.jks` (or `ANDROID_KEYSTORE_PATH`)
- **Key Alias**: `noted` (or `ANDROID_KEY_ALIAS`)
- **Store / Key Password**: `notedandroid2026` (or `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`)

When you run `pnpm package:android` or `pnpm tauri android build --apk`, Gradle automatically applies the release signing configuration and creates fully signed, aligned packages (`app-universal-release.apk`) ready for direct sideloading and user installation.

### B. Verifying APK Signature
To verify that an APK has valid v1 and v2/v3 signatures:
```bash
apksigner verify --verbose src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

---

## 4. Sideloading onto Android Devices (via ADB)

1. Enable **Developer Options** and **USB Debugging** on your Android phone.
2. Connect your device via USB or Wi-Fi pairing:
   ```bash
   adb devices
   ```
3. Install the APK directly:
   ```bash
   adb install -r noted-v0.1.0.apk
   ```

---

## 5. Automated Cloud APK Builds (GitHub Actions)

Noted features automated CI/CD pipelines in:
- [`.github/workflows/build-android.yml`](../.github/workflows/build-android.yml): Builds APKs on demand or pull requests, uploading `.apk` files as workflow artifacts and attaching them to designated GitHub Releases.
- [`.github/workflows/release.yml`](../.github/workflows/release.yml): Packages and attaches Android APKs alongside Linux (`.deb`, `.AppImage`) and Windows (`.exe`, `.msi`) packages to official GitHub Releases.

### Triggering Cloud APK Builds for Releases
To build and attach release APKs directly to an existing GitHub Release (e.g. `v0.1.0`) via the GitHub CLI:
```bash
gh workflow run build-android.yml -f release_tag=v0.1.0
```
Or monitor workflow progress and download generated artifacts:
```bash
gh run list --workflow=build-android.yml
gh run watch
```
