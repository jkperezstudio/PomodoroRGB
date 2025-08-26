# Espera a que el server de OpenRGB esté escuchando y ejecuta el restore

$port = 6742
$deadline = (Get-Date).AddSeconds(30)

# Esperar puerto
while ((Get-Date) -lt $deadline) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect("127.0.0.1", $port)
    $client.Close()
    break
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

# Ejecutar restore (usa py -3 si es tu lanzador por defecto)
$script = "C:\PROYECTOS\PROGRAMACION\PYTHON\PomodoroRGB\rgbctl.py"
Start-Process -FilePath "py" -ArgumentList "-3 `"$script`" restore" -WindowStyle Hidden
