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
Write-Host "  Visual Runtime & Design Engine" -ForegroundColor DarkGray
Write-Host ""

Write-Host "┌  vitra installer" -ForegroundColor White
Write-Host "│" -ForegroundColor DarkGray
Write-Host "◇  target:        windows-x64" -ForegroundColor Cyan
Write-Host "◇  destination:   $BinaryPath" -ForegroundColor DarkGray
Write-Host "│" -ForegroundColor DarkGray

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$DownloadUrl = "https://github.com/$Repo/releases/latest/download/vitra-windows-x64.exe"
$FallbackUrl = "https://github.com/$Repo/releases/latest/download/vitra"

Write-Host "◇  downloading vitra-windows-x64.exe..." -ForegroundColor White

try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $BinaryPath -UseBasicParsing
} catch {
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "!  native binary not found, downloading portable bundle..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $FallbackUrl -OutFile $BinaryPath -UseBasicParsing
}

Write-Host "│" -ForegroundColor DarkGray
Write-Host "✔  installed $BinaryName to $BinaryPath" -ForegroundColor Green
Write-Host "│" -ForegroundColor DarkGray

# Add to User PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", [EnvironmentVariableTarget]::User)
    $env:Path += ";$InstallDir"
    Write-Host "!  added $InstallDir to user PATH." -ForegroundColor Yellow
    Write-Host "│" -ForegroundColor DarkGray
}

Write-Host "└  get started: vitra --help" -ForegroundColor Cyan
Write-Host ""
