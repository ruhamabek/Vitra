# Vitra CLI Windows Official Installer (PowerShell)
# Usage: irm https://ruhamabek.github.io/Vitra/install.ps1 | iex

$ErrorActionPreference = 'Stop'

$Repo = "ruhamabek/Vitra"
$InstallDir = "$env:LOCALAPPDATA\Vitra\bin"
$BinaryName = "vitra.exe"
$BinaryPath = "$InstallDir\$BinaryName"

Write-Host ""
Write-Host "  ██╗   ██╗██╗████████╗██████╗  █████╗ " -ForegroundColor Cyan
Write-Host "  ██║   ██║██║╚══██╔══╝██╔══██╗██╔══██╗" -ForegroundColor Cyan
Write-Host "  ██║   ██║██║   ██║   ██████╔╝███████║" -ForegroundColor Cyan
Write-Host "  ╚██╗ ██╔╝██║   ██║   ██╔══██╗██╔══██║" -ForegroundColor Cyan
Write-Host "   ╚████╔╝ ██║   ██║   ██║  ██║██║  ██║" -ForegroundColor Cyan
Write-Host "    ╚═══╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝" -ForegroundColor Cyan
Write-Host "  Vitra Visual Runtime & Design Engine" -ForegroundColor White
Write-Host ""

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$DownloadUrl = "https://github.com/$Repo/releases/latest/download/vitra-windows-x64.exe"

Write-Host "⏳ Downloading Vitra CLI for Windows..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $DownloadUrl -OutFile $BinaryPath -UseBasicParsing

Write-Host "✓ Successfully installed $BinaryName to $BinaryPath" -ForegroundColor Green

# Add to User PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", [EnvironmentVariableTarget]::User)
    $env:Path += ";$InstallDir"
    Write-Host "✓ Added $InstallDir to PATH." -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Run 'vitra --help' to get started!" -ForegroundColor Cyan
Write-Host ""
