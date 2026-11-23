param(
  [string]$Email = 'admin@eclipse.tech',
  [string]$Password = 'Eclipse2026!'
)

$root = Split-Path -Parent $PSScriptRoot
$envText = Get-Content (Join-Path $root 'storefront/.env.local') -Raw
$key = [regex]::Match($envText, 'VITE_FIREBASE_API_KEY=([^\r\n]+)').Groups[1].Value.Trim()
$db = [regex]::Match($envText, 'VITE_FIREBASE_DATABASE_URL=([^\r\n]+)').Groups[1].Value.Trim()

if (-not $key -or -not $db) {
  Write-Host 'No se encontro la configuracion de Firebase en storefront/.env.local' -ForegroundColor Red
  exit 1
}

Write-Host "Base de datos: $db"
Write-Host "Usuario: $Email"
Write-Host ''

$body = @{ email = $Email; password = $Password; returnSecureToken = $true } | ConvertTo-Json
try {
  $auth = Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$key" -ContentType 'application/json' -Body $body
} catch {
  Write-Host 'No se pudo iniciar sesion en Firebase Auth. Revisa correo/contrasena.' -ForegroundColor Red
  Write-Host $_.ErrorDetails.Message
  exit 1
}

$token = $auth.idToken
$parts = $token.Split('.')
$payload = $parts[1].Replace('-', '+').Replace('_', '/')
while ($payload.Length % 4) { $payload += '=' }
$claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json

Write-Host "Token OK: $($claims.email) (expira $([DateTimeOffset]::FromUnixTimeSeconds([int64]$claims.exp).ToString('u')))"
Write-Host ''

$allOk = $true

# Lecturas que usa la tienda/panel. Estas deben funcionar con las reglas combinadas.
foreach ($node in @('catalogo', 'promociones', 'combos', 'themes', 'settings', 'content', 'coupons', 'orders', 'cupones', 'estadisticas', 'usuarios_clientes', 'Costos', 'clientes', 'codigos_streaming', 'limites_codigos', 'opiniones', 'usuarios')) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$db/$node.json?auth=$token" -TimeoutSec 20
    Write-Host ("LECTURA  {0,-14} OK  ({1} bytes)" -f $node, $r.Content.Length) -ForegroundColor Green
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host ("LECTURA  {0,-14} BLOQUEADA ({1})" -f $node, $code) -ForegroundColor Red
    $allOk = $false
  }
}

Write-Host ''

# Escrituras reales del panel, con claves unicas que se borran al terminar.
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$probeBody = '{"probe":true}'
$orderBody = '{"id":0,"orderNumber":"PROBE","customerName":"Prueba","subtotal":0,"discountAmount":0,"totalAmount":0,"paymentMethod":"Prueba","status":"Pending","items":[{"name":"Prueba"}]}'

$probes = @(
  @{ Path = "themes/__eclipse_probe_$suffix"; Body = $probeBody },
  @{ Path = "settings/__eclipse_probe_$suffix"; Body = $probeBody },
  @{ Path = "content/__eclipse_probe_$suffix"; Body = $probeBody },
  @{ Path = "coupons/__ECLIPSE_PROBE_$suffix"; Body = $probeBody },
  @{ Path = "combos/__eclipse_probe_$suffix"; Body = $probeBody },
  @{ Path = "promociones/destacado/__eclipse_probe_$suffix"; Body = $probeBody },
  @{ Path = "catalogo/__eclipse_probe_$suffix/__eclipse_probe_$suffix"; Body = $probeBody },
  @{ Path = "orders/__eclipse_probe_$suffix"; Body = $orderBody },
  @{ Path = "usuarios_clientes/__eclipse_probe_$suffix/studentApproved"; Body = 'false' }
)

foreach ($probe in $probes) {
  try {
    Invoke-WebRequest -UseBasicParsing -Method Put -Uri "$db/$($probe.Path).json?auth=$token" -ContentType 'application/json' -Body $probe.Body -TimeoutSec 20 | Out-Null
    Write-Host ("ESCRITURA {0,-58} OK" -f $probe.Path) -ForegroundColor Green
    try {
      Invoke-WebRequest -UseBasicParsing -Method Delete -Uri "$db/$($probe.Path).json?auth=$token" -TimeoutSec 20 | Out-Null
    } catch {
      Write-Host ("  Aviso: no se pudo borrar la prueba {0}" -f $probe.Path) -ForegroundColor Yellow
    }
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host ("ESCRITURA {0,-58} BLOQUEADA ({1})" -f $probe.Path, $code) -ForegroundColor Red
    $allOk = $false
  }
}

Write-Host ''
if ($allOk) {
  Write-Host 'TODO LISTO: las reglas combinadas estan publicadas y el panel puede guardar.' -ForegroundColor Green
} else {
  Write-Host 'FALTAN REGLAS: abre PUBLICAR_REGLAS.cmd e inicia sesion con la cuenta duena del proyecto.' -ForegroundColor Yellow
}
