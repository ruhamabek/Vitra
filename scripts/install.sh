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

echo "⏳ Downloading Vitra CLI for ${PLATFORM}-${TARGET_ARCH}..."

HTTP_CODE=$(curl -sSL -w "%{http_code}" -o "$INSTALL_DIR/$BINARY_NAME" "$DOWNLOAD_URL" || true)

if [ "$HTTP_CODE" -ne 200 ] || [ ! -s "$INSTALL_DIR/$BINARY_NAME" ]; then
  echo "ℹ️  Downloading portable universal bundle..."
  curl -fsSL -o "$INSTALL_DIR/$BINARY_NAME" "$FALLBACK_URL"
fi

chmod +x "$INSTALL_DIR/$BINARY_NAME"

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
