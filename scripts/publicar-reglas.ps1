param(
  [switch]$Storage
)

$root = Split-Path -Parent $PSScriptRoot

if ($Storage) {
  $rulesPath = Join-Path $root 'storage.rules'
  $url = 'https://console.firebase.google.com/project/my-admin-f0d0f/storage/my-admin-f0d0f.firebasestorage.app/rules'
  $target = 'Storage'
} else {
  $rulesPath = Join-Path $root 'database.rules.json'
  $url = 'https://console.firebase.google.com/project/my-admin-f0d0f/database/my-admin-f0d0f-default-rtdb/rules'
  $target = 'Realtime Database'
}

if (-not (Test-Path $rulesPath)) {
  Write-Host "No se encontro $rulesPath" -ForegroundColor Red
  exit 1
}

$rules = Get-Content $rulesPath -Raw
Set-Clipboard -Value $rules
Start-Process $url

Write-Host ''
Write-Host "Reglas de $target copiadas al portapapeles." -ForegroundColor Green
Write-Host ''
Write-Host 'Pasos:'
Write-Host '1. Inicia sesion en Firebase con la cuenta DUENA del proyecto my-admin-f0d0f.'
Write-Host '   (La cuenta mariouh1172@gmail.com no tiene acceso a ese proyecto.)'
Write-Host '2. Verifica que arriba se vea el proyecto my-admin-f0d0f.'
Write-Host '3. En el editor de Reglas, selecciona todo (Ctrl+A), borra y pega (Ctrl+V).'
Write-Host '4. Pulsa Publicar y espera el mensaje de confirmacion.'
Write-Host ''
Write-Host 'Despues ejecuta: powershell -ExecutionPolicy Bypass -File scripts\verificar-reglas.ps1'
Write-Host ''
