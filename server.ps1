# ============================================
# NHA MAY NGOC SON THANH HOA - Local HTTP Server (PowerShell)
# Dùng TcpListener - KHÔNG cần quyền admin
# Chạy PWA đúng chuẩn (service worker hoạt động)
# Cách dùng:  powershell -ExecutionPolicy Bypass -File server.ps1
# ============================================

$Port = 8080
if ($args.Count -gt 0) { $Port = [int]$args[0] }

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  NHA MAY NGOC SON THANH HOA - PWA SERVER" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Desktop: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Dien thoai: http://<IP-may-tinh>:$Port" -ForegroundColor Cyan
Write-Host "  (Tim IP bang lenh: ipconfig / xem IPv4 Address)" -ForegroundColor DarkGray
Write-Host "  (Dien thoai phai cung mang WiFi voi may tinh)" -ForegroundColor DarkGray
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Nhan Ctrl+C de dung server" -ForegroundColor Yellow
Write-Host ""

# MIME types
$mime = @{
    ".html"  = "text/html; charset=utf-8"
    ".css"   = "text/css; charset=utf-8"
    ".js"    = "application/javascript; charset=utf-8"
    ".json"  = "application/json; charset=utf-8"
    ".png"   = "image/png"
    ".woff2" = "font/woff2"
    ".md"    = "text/markdown; charset=utf-8"
    ".ico"   = "image/x-icon"
    ".txt"   = "text/plain; charset=utf-8"
}

# Tạo TcpListener trên tất cả interface
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()
Write-Host "  Server dang chay tren tat ca interface..." -ForegroundColor Green
Write-Host ""

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream)
        
        # Đọc request line
        $requestLine = $reader.ReadLine()
        if (-not $requestLine) { $client.Close(); continue }
        
        # Parse: GET /path HTTP/1.1
        $parts = $requestLine.Split(' ')
        $method = $parts[0]
        $urlPath = $parts[1]
        
        # Đọc headers (bỏ qua)
        while ($true) {
            $line = $reader.ReadLine()
            if ($null -eq $line -or $line -eq '') { break }
        }
        
        # Chỉ xử lý GET
        if ($method -ne 'GET') {
            $response = "HTTP/1.1 405 Method Not Allowed`r`nContent-Length: 0`r`n`r`n"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($response)
            $stream.Write($bytes, 0, $bytes.Length)
            $client.Close()
            continue
        }
        
        # Map URL path -> file path
        $path = [System.Uri]::UnescapeDataString($urlPath)
        if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
        $filePath = Join-Path $Root ($path.TrimStart('/'))
        
        # Ngăn path traversal
        $fullRoot = [System.IO.Path]::GetFullPath($Root)
        $fullFile = [System.IO.Path]::GetFullPath($filePath)
        if (-not $fullFile.StartsWith($fullRoot)) {
            $response = "HTTP/1.1 403 Forbidden`r`nContent-Length: 0`r`n`r`n"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($response)
            $stream.Write($bytes, 0, $bytes.Length)
            $client.Close()
            continue
        }
        
        if (Test-Path $fullFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullFile).ToLower()
            $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
            
            $fileBytes = [System.IO.File]::ReadAllBytes($fullFile)
            
            # HTTP Response headers
            $header = "HTTP/1.1 200 OK`r`n"
            $header += "Content-Type: $contentType`r`n"
            $header += "Content-Length: $($fileBytes.Length)`r`n"
            $header += "Service-Worker-Allowed: /`r`n"
            $header += "Cache-Control: no-cache`r`n"
            $header += "Access-Control-Allow-Origin: *`r`n"
            $header += "`r`n"
            
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($fileBytes, 0, $fileBytes.Length)
            $stream.Flush()
            
            Write-Host "  OK  $path ($([math]::Round($fileBytes.Length/1024,1)) KB)" -ForegroundColor DarkGreen
        } else {
            $response = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`n`r`n"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($response)
            $stream.Write($bytes, 0, $bytes.Length)
            Write-Host "  404  $path" -ForegroundColor Red
        }
        
        $client.Close()
    } catch {
        # Ctrl+C hoặc client disconnect
        if ($_.Exception.InnerException -is [System.Net.Sockets.SocketException]) {
            if ($_.Exception.InnerException.SocketErrorCode -eq 'Interrupted') { break }
        }
    }
}

$listener.Stop()
Write-Host "`nDa dung server. Tam biet!" -ForegroundColor Green