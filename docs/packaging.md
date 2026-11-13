# Packaging Guide for Desktop & Android

This guide covers building, bundling, and distributing **Noted** as native packages for **Linux**, **Windows**, and **Android** using Tauri v2.

---

## Packaging Matrix

| Target OS | Format | Artifact Extension | Distribution Use Case |
| :--- | :--- | :--- | :--- |
| **Linux** | Debian Package | `.deb` | Ubuntu, Debian, Pop!_OS, Linux Mint |
| **Linux** | AppImage | `.AppImage` | Universal portable binary across all Linux distros |
| **Windows** | NSIS Installer | `-setup.exe` | Standard Windows graphical setup wizard |
| **Windows** | WiX Installer | `.msi` | Enterprise managed deployments & Active Directory GPO |
| **Android** | Android Package | `.apk` | Direct installation and testing on Android devices |
| **Android** | Android App Bundle | `.aab` | Google Play distribution |

---

## 1. Packaging for Linux

### System Prerequisites (Ubuntu / Debian)
Ensure native build libraries and WebKit2GTK are installed:
```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libssl-dev \
  build-essential \
  curl \
  wget \
  file
```

### Build Commands
Execute any of the targeted packaging scripts:
```bash
# Build both .deb and .AppImage
pnpm package:linux

# Build only Debian package (.deb)
pnpm package:deb

# Build only portable AppImage (.AppImage)
pnpm package:appimage
```

### Artifact Outputs
- **Debian package**: `src-tauri/target/release/bundle/deb/noted_<version>_amd64.deb`
- **AppImage**: `src-tauri/target/release/bundle/appimage/noted_<version>_amd64.AppImage`

### Testing Linux Artifacts Locally
```bash
# Install and test Debian package
sudo dpkg -i src-tauri/target/release/bundle/deb/noted_*_amd64.deb

# Run portable AppImage
chmod +x src-tauri/target/release/bundle/appimage/noted_*_amd64.AppImage
./src-tauri/target/release/bundle/appimage/noted_*_amd64.AppImage
```

---

## 2. Packaging for Windows

### System Prerequisites
When building on a Windows workstation:
1. **Visual Studio C++ Build Tools**: Install "Desktop development with C++" workload via the [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. **Rust MSVC Target**:
   ```powershell
   rustup target add x86_64-pc-windows-msvc
   ```
3. **WiX Toolset v3** *(only needed for .msi builds)*:
   ```powershell
   winget install WiX.WiX
   ```
4. **NSIS** *(packaged automatically by Tauri or installed via winget)*:
   ```powershell
   winget install NSIS.NSIS
   ```

### Build Commands
```powershell
# Build both NSIS (.exe) and WiX (.msi) installers
pnpm package:windows

# Build only NSIS setup wizard
pnpm package:nsis

# Build only MSI enterprise installer
pnpm package:msi
```

### Artifact Outputs
- **NSIS Setup Installer**: `src-tauri/target/release/bundle/nsis/noted_<version>_x64-setup.exe`
- **WiX MSI Package**: `src-tauri/target/release/bundle/msi/noted_<version>_x64_en-US.msi`

### WebView2 Runtime Strategy
In `src-tauri/tauri.conf.json`, Windows bundling is configured with:
```json
"webviewInstallMode": {
  "type": "downloadBootstrapper"
}
```
This ensures Windows 10 and Windows 11 machines without an existing Evergreen WebView2 runtime automatically download and configure the runtime seamlessly during setup.

---

## 3. Automated Multi-Platform CI/CD Packaging

### Packaging for Android

Install the Android SDK, Android NDK, and Java 17, then initialize the native project once:
```bash
pnpm tauri android init
```

Build both Android release formats:
```bash
pnpm package:android
```

Or build one format:
```bash
pnpm package:android:apk
pnpm package:android:aab
```

The Android artifacts are written below:
`src-tauri/gen/android/app/build/outputs/`.

Noted includes an automated GitHub Actions release pipeline in [`.github/workflows/release.yml`](../.github/workflows/release.yml). Android APK and AAB artifacts are built alongside the desktop packages and attached to tagged releases.

### Creating a Release
To produce official signed packages for Linux and Windows simultaneously without local cross-compilation hassle:

1. Update the version in `package.json` and `src-tauri/tauri.conf.json`.
2. Push a version tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. GitHub Actions spins up parallel runners (`ubuntu-22.04` and `windows-latest`), builds each target, and uploads all four artifacts directly to the GitHub Release draft.
