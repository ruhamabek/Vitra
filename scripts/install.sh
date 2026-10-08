#!/usr/bin/env bash
set -e

# Vitra CLI Official Installer
# Usage: curl -fsSL https://ruhamabek.github.io/Vitra/install.sh | bash

REPO="ruhamabek/Vitra"
INSTALL_DIR="${VITRA_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="vitra"

 if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET="\033[0m"
  C_BOLD="\033[1m"
  C_DIM="\033[90m"
  C_CYAN="\033[36m"
  C_GREEN="\033[32m"
  C_YELLOW="\033[33m"
  C_RED="\033[31m"
else
  C_RESET=""
  C_BOLD=""
  C_DIM=""
  C_CYAN=""
  C_GREEN=""
  C_YELLOW=""
  C_RED=""
fi

# Detect OS & Architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS" in
  linux*)  PLATFORM="linux" ;;
  darwin*) PLATFORM="darwin" ;;
  msys*|mingw*|cygwin*) PLATFORM="windows" ;;
  *)
    echo -e "${C_RED}error:${C_RESET} unsupported operating system: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64) TARGET_ARCH="x64" ;;
  arm64|aarch64) TARGET_ARCH="arm64" ;;
  *)
    echo -e "${C_RED}error:${C_RESET} unsupported architecture: $ARCH"
    exit 1
    ;;
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

echo ""
echo -e "${C_CYAN}${C_BOLD}  ██╗   ██╗██╗████████╗██████╗  █████╗ ${C_RESET}"
echo -e "${C_CYAN}${C_BOLD}  ██║   ██║██║╚══██╔══╝██╔══██╗██╔══██╗${C_RESET}"
echo -e "${C_CYAN}${C_BOLD}  ██║   ██║██║   ██║   ██████╔╝███████║${C_RESET}"
echo -e "${C_CYAN}${C_BOLD}  ╚██╗ ██╔╝██║   ██║   ██╔══██╗██╔══██║${C_RESET}"
echo -e "${C_CYAN}${C_BOLD}   ╚████╔╝ ██║   ██║   ██║  ██║██║  ██║${C_RESET}"
echo -e "${C_CYAN}${C_BOLD}    ╚═══╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝${C_RESET}"
echo -e "  ${C_DIM}Visual Runtime & Design Engine${C_RESET}"
echo ""
echo -e "${C_DIM}┌${C_RESET}  ${C_BOLD}vitra installer${C_RESET}"
echo -e "${C_DIM}│${C_RESET}"
echo -e "${C_DIM}◇${C_RESET}  target:        ${C_CYAN}${PLATFORM}-${TARGET_ARCH}${C_RESET}"
echo -e "${C_DIM}◇${C_RESET}  destination:   ${C_DIM}${INSTALL_DIR}/${BINARY_NAME}${C_RESET}"
echo -e "${C_DIM}│${C_RESET}"
echo -e "${C_DIM}◇${C_RESET}  downloading ${C_BOLD}${RELEASE_NAME}${C_RESET}..."

if curl -fL --progress-bar -o "$TMP_FILE" "$DOWNLOAD_URL"; then
  mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
else
  echo -e "${C_DIM}│${C_RESET}"
  echo -e "${C_YELLOW}!${C_RESET}  native binary not found, downloading portable bundle..."
  curl -fL --progress-bar -o "$TMP_FILE" "$FALLBACK_URL"
  mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
fi

if [ ! -s "$INSTALL_DIR/$BINARY_NAME" ]; then
  echo -e "${C_RED}✕${C_RESET}  download failed or empty asset received."
  rm -f "$INSTALL_DIR/$BINARY_NAME"
  exit 1
fi

chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Verify downloaded binary executes cleanly
if ! "$INSTALL_DIR/$BINARY_NAME" --help >/dev/null 2>&1; then
  echo -e "${C_DIM}│${C_RESET}"
  echo -e "${C_YELLOW}!${C_RESET}  platform libc compatibility fallback: switching to portable bundle..."
  if curl -fL --progress-bar -o "$TMP_FILE" "$FALLBACK_URL"; then
    mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
  fi
fi

echo -e "${C_DIM}│${C_RESET}"
echo -e "${C_GREEN}✔${C_RESET}  installed ${C_BOLD}${BINARY_NAME}${C_RESET} to ${C_CYAN}${INSTALL_DIR}/${BINARY_NAME}${C_RESET}"
echo -e "${C_DIM}│${C_RESET}"

# Check if INSTALL_DIR is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo -e "${C_YELLOW}!${C_RESET}  ${C_BOLD}${INSTALL_DIR}${C_RESET} is not in your PATH."
  echo -e "${C_DIM}│${C_RESET}  add it to your environment by running:"
  
  if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
    echo -e "${C_DIM}│${C_RESET}    ${C_CYAN}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc && source ~/.zshrc${C_RESET}"
  else
    echo -e "${C_DIM}│${C_RESET}    ${C_CYAN}echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc && source ~/.bashrc${C_RESET}"
  fi
  echo -e "${C_DIM}│${C_RESET}"
fi

echo -e "${C_DIM}└${C_RESET}  ${C_BOLD}get started:${C_RESET} ${C_CYAN}vitra --help${C_RESET}"
echo ""
