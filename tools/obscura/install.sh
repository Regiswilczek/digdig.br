#!/usr/bin/env bash
# install.sh — baixa e extrai o binário do Obscura pro OS atual.
#
# Obscura é um navegador headless escrito em Rust com modo stealth, usado
# pra scraping de sites JSF/PrimeFaces (Portal Transparência PR etc).
#
# Repositório: https://github.com/h4ckf0r0day/obscura
#
# Uso:
#   bash tools/obscura/install.sh
# ou:
#   bash tools/obscura/install.sh v0.1.1
#
# O binário fica em tools/obscura/obscura (Linux/macOS) ou
# tools/obscura/obscura.exe (Windows).
set -euo pipefail

VERSION="${1:-v0.1.1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS-$ARCH" in
  Linux-x86_64)
    ASSET="obscura-x86_64-linux.tar.gz"
    BIN_NAME="obscura"
    EXTRACT="tar -xzf"
    ;;
  Darwin-arm64|Darwin-aarch64)
    ASSET="obscura-aarch64-macos.tar.gz"
    BIN_NAME="obscura"
    EXTRACT="tar -xzf"
    ;;
  *)
    echo "✗ Plataforma não suportada: $OS-$ARCH"
    echo "  Releases disponíveis: https://github.com/h4ckf0r0day/obscura/releases/tag/$VERSION"
    exit 1
    ;;
esac

URL="https://github.com/h4ckf0r0day/obscura/releases/download/$VERSION/$ASSET"

echo "═══════════════════════════════════════════════════════════════"
echo "  Instalando Obscura $VERSION ($OS-$ARCH)"
echo "═══════════════════════════════════════════════════════════════"
echo "  asset: $ASSET"
echo "  url:   $URL"

if command -v curl >/dev/null 2>&1; then
  curl -sLk -o "$ASSET" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$ASSET" "$URL"
else
  echo "✗ Precisa de curl ou wget instalado."
  exit 1
fi

echo "  ✓ baixado"

$EXTRACT "$ASSET"
chmod +x "$BIN_NAME"
rm "$ASSET"

echo "  ✓ extraído"
echo
"./$BIN_NAME" --help | head -8
echo
echo "Pronto. Use:"
echo "  ./obscura serve --port 9222 --stealth"
echo "  ./obscura fetch --stealth --dump html https://...  # one-shot"
