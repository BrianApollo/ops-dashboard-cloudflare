# AdsPower CORS bridge
#
# AdsPower's Local API (127.0.0.1:50325) only answers browser requests that come
# from a localhost origin. The hosted dashboard (app.accotta.com) is therefore
# blocked with "CORS ERROR". This script listens on 127.0.0.1:50326, forwards
# every request to AdsPower as a plain server-side call, and adds the CORS
# headers the browser needs. Run it on any PC that uses the AdsPower features.
#
# Usage: double-click adspower-bridge.bat (keeps this window open while running)

$ListenPort = 50326
$AdsPower   = "http://127.0.0.1:50325"
# AdsPower API key (Settings -> API). Used when the request itself carries none.
# This AdsPower version only accepts the key as "Authorization: Bearer <key>",
# so the bridge turns the dashboard's ?api_key=... into that header.
$ApiKey     = "2f36fdfa08b2446a89d52dc4c4abff900079acde08801acf"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$ListenPort/")
$listener.Prefixes.Add("http://localhost:$ListenPort/")
$listener.Start()
Write-Host "AdsPower bridge listening on http://127.0.0.1:$ListenPort -> $AdsPower"
Write-Host "Leave this window open. Press Ctrl+C to stop."

function Add-Cors($resp, $origin) {
  if ([string]::IsNullOrEmpty($origin)) { $origin = "*" }
  $resp.Headers["Access-Control-Allow-Origin"]  = $origin
  $resp.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
  $resp.Headers["Access-Control-Allow-Headers"] = "Content-Type"
  $resp.Headers["Access-Control-Allow-Private-Network"] = "true"
  $resp.Headers["Vary"] = "Origin"
}

while ($listener.IsListening) {
  $ctx  = $listener.GetContext()
  $req  = $ctx.Request
  $resp = $ctx.Response
  $origin = $req.Headers["Origin"]
  Add-Cors $resp $origin

  try {
    if ($req.HttpMethod -eq "OPTIONS") {
      $resp.StatusCode = 204
    } else {
      $target = $AdsPower + $req.RawUrl
      $key = $req.QueryString["api_key"]
      if ([string]::IsNullOrEmpty($key)) { $key = $ApiKey }
      $headers = @{ "Authorization" = "Bearer $key" }
      $body = $null
      if ($req.HasEntityBody) {
        $reader = New-Object System.IO.StreamReader($req.InputStream)
        $body = $reader.ReadToEnd()
      }
      try {
        $r = Invoke-WebRequest -Uri $target -Method $req.HttpMethod -Body $body -Headers $headers `
              -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
        $out = $r.Content
        $resp.StatusCode = [int]$r.StatusCode
      } catch {
        # Non-2xx from AdsPower: pass its body through so the UI can show the message
        $r = $_.Exception.Response
        if ($r) {
          $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
          $out = $sr.ReadToEnd()
          $resp.StatusCode = [int]$r.StatusCode
        } else {
          $out = '{"code":-1,"msg":"AdsPower is not running on 127.0.0.1:50325"}'
          $resp.StatusCode = 502
        }
      }
      $resp.ContentType = "application/json; charset=utf-8"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($out)
      $resp.ContentLength64 = $bytes.Length
      $resp.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host ("{0} {1} -> {2}" -f (Get-Date -Format "HH:mm:ss"), $req.RawUrl, $resp.StatusCode)
    }
  } catch {
    Write-Host "bridge error: $_"
    try { $resp.StatusCode = 500 } catch {}
  } finally {
    $resp.Close()
  }
}
