#!/usr/bin/env bash
set -euo pipefail

REPO="jayo14/noted"
APP_NAME="noted"
INSTALL_DIR="${HOME}/.local/bin"
SHARE_DIR="${HOME}/.local/share"
APP_EXTRACT_DIR="${SHARE_DIR}/noted-app"
DESKTOP_FILE="${SHARE_DIR}/applications/noted.desktop"
AUTOSTART_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/autostart"
AUTOSTART_FILE="${AUTOSTART_DIR}/noted.desktop"
ICON_DIR="${SHARE_DIR}/icons/hicolor/128x128/apps"
ICON_FILE="${ICON_DIR}/noted.png"
VERSION="${NOTED_VERSION:-latest}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -v|--version)
      VERSION="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

ARCH="$(uname -m)"
if [[ "${ARCH}" != "x86_64" && "${ARCH}" != "amd64" ]]; then
  echo "Error: Unsupported architecture '${ARCH}'. Currently only x86_64/amd64 Linux AppImages are published."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required to install ${APP_NAME}."
  exit 1
fi

echo "==> Fetching ${APP_NAME} release info (${VERSION})..."
if [[ "${VERSION}" == "latest" ]]; then
  API_URL="https://api.github.com/repos/${REPO}/releases/latest"
else
  API_URL="https://api.github.com/repos/${REPO}/releases/tags/${VERSION}"
fi

RELEASE_JSON="$(curl -fsSL "${API_URL}")"
APPIMAGE_URL="$(
  printf '%s' "${RELEASE_JSON}" \
    | grep -oE 'https://[^"]+\.AppImage' \
    | head -n 1 || true
)"

if [[ -z "${APPIMAGE_URL}" ]]; then
  echo "Error: Could not find an AppImage asset in release '${VERSION}'."
  exit 1
fi

mkdir -p "${INSTALL_DIR}" "${SHARE_DIR}/applications" "${AUTOSTART_DIR}" "${ICON_DIR}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

APPIMAGE_TMP="${TMP_DIR}/noted.AppImage"
echo "==> Downloading ${APPIMAGE_URL}..."
curl -fL --progress-bar "${APPIMAGE_URL}" -o "${APPIMAGE_TMP}"
chmod +x "${APPIMAGE_TMP}"

HAS_FUSE2=false
if command -v ldconfig >/dev/null 2>&1 && ldconfig -p 2>/dev/null | grep -q "libfuse\.so\.2"; then
  HAS_FUSE2=true
elif [[ -f /usr/lib/libfuse.so.2 || -f /usr/lib/x86_64-linux-gnu/libfuse.so.2 || -f /lib/x86_64-linux-gnu/libfuse.so.2 ]]; then
  HAS_FUSE2=true
fi

rm -f "${INSTALL_DIR}/${APP_NAME}"
rm -rf "${APP_EXTRACT_DIR}"

if [[ "${HAS_FUSE2}" == "true" ]]; then
  mv "${APPIMAGE_TMP}" "${INSTALL_DIR}/${APP_NAME}"
  chmod +x "${INSTALL_DIR}/${APP_NAME}"
else
  echo "==> libfuse2 not detected; extracting AppImage for native execution..."
  (
    cd "${TMP_DIR}"
    "${APPIMAGE_TMP}" --appimage-extract >/dev/null
  )
  mv "${TMP_DIR}/squashfs-root" "${APP_EXTRACT_DIR}"
  ln -sf "${APP_EXTRACT_DIR}/AppRun" "${INSTALL_DIR}/${APP_NAME}"
fi

echo "==> Installing desktop entry and icon..."
curl -fsSL "https://raw.githubusercontent.com/${REPO}/main/src-tauri/icons/128x128.png" -o "${ICON_FILE}" || true

cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Name=Noted
Comment=A fast, elegant, offline-first notes & clipboard application
Exec=${INSTALL_DIR}/${APP_NAME} %U
Icon=${ICON_FILE}
Terminal=false
Type=Application
Categories=Office;Utility;TextEditor;
StartupWMClass=noted
EOF

cat > "${AUTOSTART_FILE}" <<EOF
[Desktop Entry]
Name=Noted
Comment=A fast, elegant, offline-first notes & clipboard application
Exec=${INSTALL_DIR}/${APP_NAME}
Icon=${ICON_FILE}
Terminal=false
Type=Application
Categories=Office;Utility;TextEditor;
StartupNotify=false
StartupWMClass=noted
X-GNOME-Autostart-enabled=true
EOF

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${SHARE_DIR}/applications" >/dev/null 2>&1 || true
fi

echo ""
echo "Noted installed successfully to ${INSTALL_DIR}/${APP_NAME}!"
if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
  echo "Note: Add '${INSTALL_DIR}' to your PATH if 'noted' is not found:"
  echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
fi
echo "Run 'noted' from your terminal or launch 'Noted' from your application menu."
