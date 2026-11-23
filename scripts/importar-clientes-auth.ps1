param(
  [string]$Project = 'my-admin-f0d0f',
  [switch]$Apply
)

# ---------------------------------------------------------------------------
# Importa los usuarios de Firebase Authentication a RTDB /usuarios_clientes.
# Authentication es solo el login; el panel "Clientes" lee RTDB.
# No sobrescribe isStudent / studentApproved de los clientes ya existentes.
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exportFile = Join-Path $root 'auth-users.json'
$currentFile = Join-Path $root 'clientes-actuales.json'
$outFile = Join-Path $root 'clientes-para-subir.json'

Write-Host ''
Write-Host '=== Importar clientes de Firebase Auth al panel ===' -ForegroundColor Cyan
Write-Host 'Cuenta actual de Firebase CLI:' -ForegroundColor Gray
$who = (& firebase login:list 2>&1 | Out-String)
Write-Host $who
if ($who -notmatch 'Logged in as') {
  throw 'No hay una cuenta de Firebase CLI activa. Ejecuta: firebase login'
}
Write-Host 'Si esa cuenta NO es la duena de my-admin-f0d0f, ejecuta primero:'
Write-Host '  firebase login --reauth' -ForegroundColor Yellow
Write-Host ''

Write-Host '1/3 Exportando usuarios de Authentication...' -ForegroundColor Cyan
& firebase auth:export $exportFile --format JSON --project $Project
if ($LASTEXITCODE -ne 0) { throw 'No se pudo exportar Authentication.' }

Write-Host '2/3 Leyendo usuarios_clientes actuales...' -ForegroundColor Cyan
& firebase database:get /usuarios_clientes --project $Project -o $currentFile
if ($LASTEXITCODE -ne 0) {
  Write-Host 'No habia nodos previos o no se pudo leer; se creara desde cero.' -ForegroundColor Yellow
  '{}' | Set-Content -LiteralPath $currentFile -Encoding UTF8
}

$raw = Get-Content -LiteralPath $exportFile -Raw | ConvertFrom-Json
if ($raw.users) { $users = $raw.users } else { $users = $raw }
if (-not $users) { throw 'El archivo exportado no contiene usuarios.' }

$currentRaw = Get-Content -LiteralPath $currentFile -Raw
$current = $null
if ($currentRaw.Trim()) {
  try { $current = $currentRaw | ConvertFrom-Json } catch { $current = $null }
}

$result = [ordered]@{}
if ($current -is [pscustomobject]) {
  foreach ($prop in $current.PSObject.Properties) {
    $result[$prop.Name] = $prop.Value
  }
}

$now = (Get-Date).ToUniversalTime().ToString('o')
$created = 0
$updated = 0

foreach ($u in $users) {
  $uid = ''
  if ($u.localId) { $uid = [string]$u.localId }
  elseif ($u.uid) { $uid = [string]$u.uid }
  if (-not $uid) { continue }

  $email = ''
  if ($u.email) { $email = [string]$u.email }
  $display = ''
  if ($u.displayName) { $display = [string]$u.displayName }
  if (-not $display -and $email) { $display = ($email -split '@')[0] }

  $createdAt = ''
  if ($u.creationTime) {
    try {
      $createdAt = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$u.creationTime).UtcDateTime.ToString('o')
    } catch { $createdAt = '' }
  }

  $photo = ''
  if ($u.photoUrl) { $photo = [string]$u.photoUrl }

  if ($result.Contains($uid)) {
    # Ya existe: solo completamos campos basicos, NUNCA tocamos aprobacion.
    $entry = @{}
    foreach ($prop in $result[$uid].PSObject.Properties) {
      $entry[$prop.Name] = $prop.Value
    }
    if (-not $entry['email'] -and $email) { $entry['email'] = $email }
    if (-not $entry['displayName'] -and $display) { $entry['displayName'] = $display }
    if (-not $entry['createdAt'] -and $createdAt) { $entry['createdAt'] = $createdAt }
    $entry['authUid'] = $uid
    $entry['source'] = 'auth-import'
    $entry['importedAt'] = $now
    $result[$uid] = $entry
    $updated++
  } else {
    $result[$uid] = [ordered]@{
      email            = $email
      displayName      = $display
      photoUrl         = $photo
      emailVerified    = [bool]$u.emailVerified
      disabled         = [bool]$u.disabled
      createdAt        = $createdAt
      updatedAt        = $now
      isStudent        = $false
      studentApproved  = $false
      studentCredentialUrl = ''
      authUid          = $uid
      source           = 'auth-import'
      importedAt       = $now
    }
    $created++
  }
}

$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $outFile -Encoding UTF8

Write-Host ''
Write-Host "Listo: $created nuevos, $updated ya existentes." -ForegroundColor Green
Write-Host "Archivo generado: $outFile" -ForegroundColor Gray
Write-Host 'Este archivo contiene correos: no lo subas a GitHub.' -ForegroundColor Yellow

if (-not $Apply) {
  $answer = Read-Host 'Subir ahora a Realtime Database? (S/N)'
  if ($answer -match '^[sS]') { $Apply = $true }
}

if ($Apply) {
  Write-Host '3/3 Subiendo a /usuarios_clientes (update, no borra nada)...' -ForegroundColor Cyan
  & firebase database:update /usuarios_clientes $outFile --project $Project -f
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo subir. Revisa que la cuenta tenga permisos.' }
  Write-Host 'IMPORTACION TERMINADA. Recarga el panel y entra a Clientes.' -ForegroundColor Green
} else {
  Write-Host 'Para subirlo despues:' -ForegroundColor Gray
  Write-Host ('  firebase database:update /usuarios_clientes "{0}" --project {1} -f' -f $outFile, $Project) -ForegroundColor Gray
}
