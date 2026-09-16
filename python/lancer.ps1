param([ValidateRange(1024,65535)][int]$Port = 8501, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$appPath = Join-Path $PSScriptRoot 'app.py'
$url = "http://127.0.0.1:$Port"

function Test-PortLibre {
    $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $probe.Server.ExclusiveAddressUse = $true
    try { $probe.Start(); return $true }
    catch { return $false }
    finally { $probe.Stop() }
}

function Test-ProcessusAtelier([int]$OwnerId) {
    try {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $OwnerId" -ErrorAction Stop
        $match = [regex]::Match($process.CommandLine, '(?i)\s-m\s+streamlit\s+run\s+(?:"([^"]+)"|(\S+))')
        if (-not $match.Success) { return $false }
        $script = $match.Groups[1].Value
        if (-not $script) { $script = $match.Groups[2].Value }
        if ([System.IO.Path]::IsPathRooted($script)) {
            return [System.IO.Path]::GetFullPath($script) -eq [System.IO.Path]::GetFullPath($appPath)
        }
        # Compatibilite avec le premier lancement, qui utilisait "app.py" relatif.
        # Sous Windows, le python du venv lance parfois un enfant avec le Python de base.
        if ($script -notin @('app.py', '.\app.py', './app.py')) { return $false }
        $prefix = '(?i)^"?' + [regex]::Escape($venvPython) + '"?(?:\s|$)'
        if ($process.CommandLine -match $prefix) { return $true }
        $parent = Get-CimInstance Win32_Process -Filter ("ProcessId = " + $process.ParentProcessId) -ErrorAction Stop
        $legacyRun = '(?i)\s-m\s+streamlit\s+run\s+(?:"(?:\.[\\/])?app\.py"|(?:\.[\\/])?app\.py)(?:\s|$)'
        return ($parent.CommandLine -match $prefix) -and ($parent.CommandLine -match $legacyRun)
    } catch { return $false }
}

function Get-EtatAtelier {
    if (Test-PortLibre) { return 'libre' }
    try {
        $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1', '0.0.0.0') })
        $recognized = $false
        foreach ($listener in $listeners) {
            if (Test-ProcessusAtelier $listener.OwningProcess) { $recognized = $true; break }
        }
        if (-not $recognized) { return 'autre' }
    } catch { return 'autre' }
    # Un deuxieme clic peut survenir pendant le demarrage du premier serveur.
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
        try {
            $health = Invoke-WebRequest -Uri "$url/_stcore/health" -UseBasicParsing -TimeoutSec 1
            if ($health.StatusCode -eq 200 -and $health.Content.Trim() -eq 'ok') { return 'pret' }
        } catch { }
        Start-Sleep -Milliseconds 300
    }
    return 'indisponible'
}

function Ouvrir-AtelierExistant {
    Write-Host "L'atelier est deja en cours d'execution : $url"
    if (-not $NoBrowser) {
        try { Start-Process -FilePath $url }
        catch { Write-Host "Ouvrir cette adresse manuellement dans le navigateur." }
    }
}

function Signaler-PortOccupe([string]$State) {
    if ($State -eq 'indisponible') {
        Write-Host "L'atelier occupe le port $Port mais ne repond pas encore. Reessayer dans quelques instants."
    } else {
        Write-Host "Le port $Port est occupe par un autre service, ou son identite ne peut pas etre verifiee."
        Write-Host 'Aucun processus ne sera arrete. Pour choisir un autre port : .\lancer.ps1 -Port 8502'
    }
}

$state = Get-EtatAtelier
if ($state -eq 'pret') { Ouvrir-AtelierExistant; exit 0 }
if ($state -ne 'libre') { Signaler-PortOccupe $state; exit 1 }
if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Host 'Executer installer.ps1 une premiere fois.'
    exit 1
}
Push-Location $PSScriptRoot
try {
    Write-Host "Demarrage de l'atelier : $url. Garder cette fenetre ouverte ; Ctrl+C arrete le serveur."
    $headless = if ($NoBrowser) { 'true' } else { 'false' }
    & $venvPython -m streamlit run $appPath --server.address 127.0.0.1 --server.port $Port --server.headless $headless
    if ($LASTEXITCODE -ne 0) {
        # Si deux lanceurs ont trouve le port libre ensemble, reutiliser le gagnant.
        $state = Get-EtatAtelier
        if ($state -eq 'pret') { Ouvrir-AtelierExistant; exit 0 }
        if ($state -ne 'libre') { Signaler-PortOccupe $state }
        else { Write-Host 'Demarrage interrompu. Consulter le message Python ci-dessus.' }
        exit 1
    }
    exit 0
} finally { Pop-Location }
