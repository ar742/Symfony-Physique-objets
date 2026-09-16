param([ValidateRange(1024,65535)][int]$Port = 8501)
$ErrorActionPreference = 'Stop'
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) { throw 'Executer installer.ps1 une premiere fois.' }
Push-Location $PSScriptRoot
try {
    Write-Host "Ouvrir http://localhost:$Port dans le navigateur. Ctrl+C arrete le serveur."
    & $venvPython -m streamlit run app.py --server.address 127.0.0.1 --server.port $Port --server.headless true
    if ($LASTEXITCODE -ne 0) { throw 'Le serveur Python ne peut pas demarrer. Verifier que le port est libre.' }
} finally { Pop-Location }
