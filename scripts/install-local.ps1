# Run in PowerShell on Windows with Docker Desktop already installed.
# Creates a private local single-cafe install; NEVER exposes port 8080 to LAN.
# No built-in/default admin password is used.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $repo
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker Desktop is required. Install/start Docker Desktop before running this script.'
    }
    & docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker engine is not running. Start Docker Desktop first.'
    }
    $config = Join-Path $repo '.env'
    if (-not (Test-Path $config)) {
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $one = New-Object byte[] 32
            $two = New-Object byte[] 32
            $rng.GetBytes($one)
            $rng.GetBytes($two)
            $dbSecret = [BitConverter]::ToString($one).Replace('-', '')
            $rootSecret = [BitConverter]::ToString($two).Replace('-', '')
        } finally {
            $rng.Dispose()
        }
        @"
SPEEDY_DB_PASSWORD=$dbSecret
SPEEDY_DB_ROOT_PASSWORD=$rootSecret
SPEEDY_ALLOWED_HOURLY_RATES=100,150,200,250,300
"@ | Set-Content -LiteralPath $config -Encoding ASCII
        Write-Host 'Created private .env with independent random database passwords.'
        Write-Host 'Do NOT commit or share .env. Protect your PC and back it up securely.'
    } else {
        Write-Host 'Existing .env found. Database credentials have NOT been changed.'
    }
    & docker compose --env-file .env -f deploy/local.compose.yml up -d --build --wait
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose startup failed. Review docker compose logs.' }

    $answer = Read-Host 'Configure/reset administrator password now? [y/N]'
    if ($answer -match '^[yY]$') {
        $secret = Read-Host 'New admin password (minimum 12 characters)' -AsSecureString
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
        try {
            $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
            if ($adminPassword.Length -lt 12 -or $adminPassword.Length -gt 200) {
                throw 'Admin password must contain 12 to 200 characters.'
            }
            # Pass through the host environment, not an on-screen command argument.
            $env:SPEEDY_ADMIN_PASSWORD = $adminPassword
            & docker compose --env-file .env -f deploy/local.compose.yml exec -T -e SPEEDY_ADMIN_PASSWORD app php /opt/speedy/scripts/bootstrap-admin.php
            if ($LASTEXITCODE -ne 0) { throw 'Admin setup failed.' }
            Write-Host 'Administrator configured. Login username: admin'
        } finally {
            Remove-Item Env:SPEEDY_ADMIN_PASSWORD -ErrorAction SilentlyContinue
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
            $adminPassword = $null
        }
    } else {
        Write-Warning 'Admin provisioning was skipped. A fresh database has NO default administrator. Configure one before logging in.'
    }
    Write-Host 'Local app: http://localhost:8080 (same computer only)'
    Write-Host 'Next: configure automated encrypted off-site backups, and read docs/PUBLIC_RELEASE_CHECKLIST.md.'
} finally {
    Pop-Location
}
