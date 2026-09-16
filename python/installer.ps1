param([string]$Python = '')
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
    if (-not (Test-Path -LiteralPath $venvPython)) {
        if (-not $Python) {
            $launcher = Get-Command py -ErrorAction SilentlyContinue
            if ($launcher) {
                $candidate = & $launcher.Source -3.12 -c 'import sys; print(sys.executable)' 2>$null
                if ($LASTEXITCODE -eq 0) { $Python = $candidate }
            }
        }
        if (-not $Python) {
            $command = Get-Command python -ErrorAction SilentlyContinue
            if ($command) { $Python = $command.Source }
        }
        if (-not $Python) {
            $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
            if (Test-Path -LiteralPath $bundled) { $Python = $bundled }
        }
        if (-not $Python) { throw 'Installer Python 3.12 ou plus, puis relancer avec -Python "chemin\vers\python.exe".' }
        & $Python -c 'import sys; assert sys.version_info >= (3,12), "Python 3.12 ou plus requis"'
        if ($LASTEXITCODE -ne 0) { throw 'Version Python incompatible.' }
        & $Python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Creation de .venv impossible.' }
    }
    & $venvPython -m pip install -r requirements-lock.txt
    if ($LASTEXITCODE -ne 0) { throw 'Installation des dependances incomplete.' }
    Write-Host 'Atelier pret. Lancer : powershell -NoProfile -ExecutionPolicy Bypass -File .\lancer.ps1'
} finally { Pop-Location }
