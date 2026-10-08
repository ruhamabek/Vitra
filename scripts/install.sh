#!/usr/bin/env bash
set -e

# Vitra CLI Official Installer
# Usage: curl -fsSL https://ruhamabek.github.io/Vitra/install.sh | bash

REPO="ruhamabek/Vitra"
INSTALL_DIR="${VITRA_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="vitra"

echo ""
echo "  ██╗   ██╗██╗████████╗██████╗  █████╗ "
echo "  ██║   ██║██║╚══██╔══╝██╔══██╗██╔══██╗"
echo "  ██║   ██║██║   ██║   ██████╔╝███████║"
echo "  ╚██╗ ██╔╝██║   ██║   ██╔══██╗██╔══██║"
echo "   ╚████╔╝ ██║   ██║   ██║  ██║██║  ██║"
echo "    ╚═══╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝"
echo "  Vitra Visual Runtime & Design Engine"
echo ""

# Detect OS & Architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS" in
  linux*)  PLATFORM="linux" ;;
  darwin*) PLATFORM="darwin" ;;
  msys*|mingw*|cygwin*) PLATFORM="windows" ;;
  *) echo "❌ Unsupported operating system: $OS"; exit 1 ;;
esac

case "$ARCH" in
  x86_64|amd64) TARGET_ARCH="x64" ;;
  arm64|aarch64) TARGET_ARCH="arm64" ;;
  *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
esac

RELEASE_NAME="vitra-${PLATFORM}-${TARGET_ARCH}"
if [ "$PLATFORM" = "windows" ]; then
  RELEASE_NAME="${RELEASE_NAME}.exe"
  BINARY_NAME="vitra.exe"
fi

mkdir -p "$INSTALL_DIR"

DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${RELEASE_NAME}"
FALLBACK_URL="https://github.com/${REPO}/releases/latest/download/vitra"

TMP_FILE="$INSTALL_DIR/.vitra.download.tmp"
trap 'rm -f "$TMP_FILE"' EXIT INT TERM

echo "⏳ Downloading Vitra CLI for ${PLATFORM}-${TARGET_ARCH}..."

if curl -fL --progress-bar -o "$TMP_FILE" "$DOWNLOAD_URL"; then
  mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
else
  echo "ℹ️  Native binary not available, downloading portable universal bundle..."
  curl -fL --progress-bar -o "$TMP_FILE" "$FALLBACK_URL"
  mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
fi

if [ ! -s "$INSTALL_DIR/$BINARY_NAME" ]; then
  echo "❌ Download failed or file is empty."
  rm -f "$INSTALL_DIR/$BINARY_NAME"
  exit 1
fi

chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Verify downloaded binary executes cleanly
if ! "$INSTALL_DIR/$BINARY_NAME" --help >/dev/null 2>&1; then
  echo "ℹ️  Native binary not compatible with system environment, falling back to portable universal bundle..."
  if curl -fL --progress-bar -o "$TMP_FILE" "$FALLBACK_URL"; then
    mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
  fi
fi

echo ""
echo "✓ Successfully installed $BINARY_NAME to $INSTALL_DIR/$BINARY_NAME"
echo ""

# Check if INSTALL_DIR is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo "⚠️  $INSTALL_DIR is not in your \$PATH."
  echo "   To enable running 'vitra' directly, run:"
  
  if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
    echo "     echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc && source ~/.zshrc"
  else
    echo "     echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc"
  fi
  echo ""
fi

echo "🚀 Try running: vitra --help"
echo ""
