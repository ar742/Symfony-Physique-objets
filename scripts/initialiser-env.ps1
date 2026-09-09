[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectDirectory '.env'
if (Test-Path -LiteralPath $environmentFile) {
    Write-Host 'Le fichier .env existe deja : aucune modification.'
    exit 0
}

function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}

$settings = @(
    "WEB_PORT=$Port"
    "APP_SECRET=$(New-LocalSecret)"
    "MYSQL_PASSWORD=$(New-LocalSecret)"
    "MYSQL_ROOT_PASSWORD=$(New-LocalSecret)"
)
$encoding = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($environmentFile, ($settings -join "`n") + "`n", $encoding)
Write-Host "Configuration locale creee pour le port $Port. Les secrets ne sont pas affiches."
