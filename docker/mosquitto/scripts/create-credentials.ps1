# Generate Mosquitto credentials for the Smart Factory broker.
# Creates: docker/mosquitto/config/passwd (hashed passwords) + docker/mosquitto/config/acl
#
# Users created:
#   backend           - service account for the NestJS backend (subscribe factory/#)
#   machine_M001..M030 - one account per machine (publish only its own topics)
#
# Machine password format: {MACHINE_CODE}@SmartFactory  (e.g. M001@SmartFactory)
# Backend password is read from $env:MQTT_PASSWORD or defaults to SmartFactory@123.
#
# Usage:
#   powershell -File docker/mosquitto/scripts/create-credentials.ps1
#   docker compose restart mosquitto

param(
    [int]$MachineCount = 30,
    [string]$MachinePrefix = "machine_",
    [string]$BackendUser = "backend",
    [string]$BackendPassword = $env:MQTT_PASSWORD
)

$ErrorActionPreference = "Stop"
if (-not $BackendPassword) { $BackendPassword = "SmartFactory@123" }

$configDir = Join-Path $PSScriptRoot "..\config"
$configDir = (Resolve-Path $configDir).Path
$passwdFile = Join-Path $configDir "passwd"
$aclFile = Join-Path $configDir "acl"

# Generate the passwd file with a throwaway container (does not require the
# broker to be running - solves the bootstrap chicken-and-egg problem).
function Invoke-MosquittoPasswd {
    param(
        [string]$Action,       # "-c" or "" (create or append)
        [string]$User,
        [string]$Password
    )
    $dockerArgs = @("--rm", "-v", "${configDir}:/mosquitto/config", "eclipse-mosquitto:2", "mosquitto_passwd", "-b")
    if ($Action) { $dockerArgs += $Action }
    $dockerArgs += @("/mosquitto/config/passwd", $User, $Password)
    docker run @dockerArgs
    if ($LASTEXITCODE -ne 0) { throw "mosquitto_passwd failed for user $User" }
}

if (Test-Path $passwdFile) { Remove-Item $passwdFile }

Write-Host "Creating $BackendUser account..."
Invoke-MosquittoPasswd -Action "-c" -User $BackendUser -Password $BackendPassword

for ($i = 1; $i -le $MachineCount; $i++) {
    $code = "M{0:D3}" -f $i
    $user = "$MachinePrefix$code"
    $pass = "$code@SmartFactory"
    Invoke-MosquittoPasswd -User $user -Password $pass
}

# --- ACL file ---
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Smart Factory MQTT ACL")
$lines.Add("")
$lines.Add("user $BackendUser")
$lines.Add("topic read factory/#")
$lines.Add("topic read `$SYS/#")
$lines.Add("")
foreach ($i in 1..$MachineCount) {
    $code = "M{0:D3}" -f $i
    $lines.Add("user $MachinePrefix$code")
    $lines.Add("topic write factory/machine/$code/#")
    $lines.Add("")
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($aclFile, $lines, $utf8NoBom)

# Mosquitto runs as the "mosquitto" user - make the files readable by it.
docker run --rm -v "${configDir}:/mosquitto/config" eclipse-mosquitto:2 sh -c "chmod 644 /mosquitto/config/passwd /mosquitto/config/acl"
if ($LASTEXITCODE -ne 0) { throw "Failed to fix file permissions" }

Write-Host "Credentials written to $passwdFile and $aclFile"
Write-Host "Machine password format: {CODE}@SmartFactory (e.g. M001@SmartFactory)"
Write-Host "Next step: docker compose restart mosquitto"
