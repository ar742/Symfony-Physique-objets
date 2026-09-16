param([ValidateRange(1024,65535)][int]$Port = 8888)
$ErrorActionPreference = 'Stop'
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) { throw 'Executer installer.ps1 une premiere fois.' }
Push-Location $PSScriptRoot
try {
    & $venvPython -m jupyter lab notebooks/01_explorer_les_graphes.ipynb --ServerApp.ip=127.0.0.1 --ServerApp.port=$Port
    if ($LASTEXITCODE -ne 0) { throw 'Jupyter ne peut pas demarrer.' }
} finally { Pop-Location }
