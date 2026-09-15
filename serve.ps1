# CPO 정보방 로컬 서버 — HttpListener 권한 없이 TcpListener 사용
$root = $PSScriptRoot
$port = 8080
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "CPO 정보방: http://127.0.0.1:$port/  (종료는 Ctrl+C)"
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".json" = "application/json"
  ".md"   = "text/plain; charset=utf-8"
  ".ico"  = "image/x-icon"
}

function Send-Response($stream, $code, $contentType, $bytes) {
  $reason = @{ 200 = "OK"; 404 = "Not Found"; 400 = "Bad Request" }[$code]
  $header = "HTTP/1.1 $code $reason`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
  $headBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if ($bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 5000
      $buffer = New-Object byte[] 8192
      $read = $stream.Read($buffer, 0, $buffer.Length)
      if ($read -le 0) { $client.Close(); continue }
      $req = [Text.Encoding]::ASCII.GetString($buffer, 0, $read)
      $first = ($req -split "`r`n")[0]
      if ($first -notmatch "^(GET|HEAD) (\S+)") {
        Send-Response $stream 400 "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("Bad Request"))
        continue
      }
      $rel = [Uri]::UnescapeDataString($Matches[2].Split("?")[0])
      if ($rel -eq "/" -or $rel -eq "") { $rel = "/index.html" }
      $rel = $rel.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
      if ($rel.Contains("..")) {
        Send-Response $stream 400 "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("Bad Request"))
        continue
      }
      $full = Join-Path $root $rel
      if (-not (Test-Path -LiteralPath $full) -or (Get-Item -LiteralPath $full).PSIsContainer) {
        Send-Response $stream 404 "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("Not found"))
        continue
      }
      $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
      $ctype = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($full)
      Send-Response $stream 200 $ctype $bytes
    } catch {
      # ignore per-request errors
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
