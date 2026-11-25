# Development & Building

## Prerequisites

- **Node.js** v18+ (v20+ recommended) and **pnpm**
- **Rust toolchain** via [rustup](https://rustup.rs/) (for desktop & Android builds)
- **Linux system libraries** (Ubuntu / Debian / Zorin):
  ```bash
  sudo apt update && sudo apt install -y \
    libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```

## Local Development

```bash
git clone https://github.com/jayo14/noted.git
cd noted
pnpm install

pnpm dev         # Web app at http://localhost:1420
pnpm tauri dev   # Native desktop app (SQLite + Rust backend)
```

## Testing & Verification

```bash
pnpm test        # Run Vitest unit & integration suites
pnpm build       # TypeScript check + production Vite bundle
```

## Packaging

- **Linux (`.deb`, `.AppImage`):** `pnpm package:linux`
- **Windows (`.exe`, `.msi`):** `pnpm package:windows`
- **Android (`.apk`, `.aab`):** `pnpm package:android`

See [packaging.md](packaging.md) and [android-packaging.md](android-packaging.md) for full release and signing details.
