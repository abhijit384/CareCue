# System inspection script for CareCue environment cleanup

Write-Host "=== DISK DRIVES ==="
Get-CimInstance Win32_LogicalDisk | ForEach-Object {
    $freeGB = [math]::Round($_.FreeSpace / 1GB, 2)
    $sizeGB = [math]::Round($_.Size / 1GB, 2)
    $usedGB = [math]::Round(($_.Size - $_.FreeSpace) / 1GB, 2)
    Write-Host ("Drive {0} Size: {1} GB | Used: {2} GB | Free: {3} GB" -f $_.DeviceID, $sizeGB, $usedGB, $freeGB)
}

Write-Host "`n=== PYTHON EXECUTABLES ==="
Get-Command python -All -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("Found: {0}" -f $_.Source)
}

Write-Host "`n=== COMMON CACHE DIRECTORIES ==="
$cachePaths = @(
    "C:\Users\Abhijit\AppData\Local\npm-cache",
    "C:\Users\Abhijit\AppData\Roaming\npm-cache",
    "C:\Users\Abhijit\AppData\Local\pip\cache",
    "C:\Users\Abhijit\AppData\Local\Temp",
    "C:\Windows\Temp",
    "C:\Users\Abhijit\.gradle",
    "C:\Users\Abhijit\.m2",
    "C:\Users\Abhijit\.cache",
    "C:\Users\Abhijit\AppData\Local\pnpm",
    "C:\Users\Abhijit\AppData\Local\Yarn"
)

foreach ($p in $cachePaths) {
    if (Test-Path $p) {
        $measure = Get-ChildItem -Path $p -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
        $sizeMB = [math]::Round(($measure.Sum / 1MB), 2)
        $sizeGB = [math]::Round(($measure.Sum / 1GB), 2)
        Write-Host ("{0} -> {1} MB ({2} GB)" -f $p, $sizeMB, $sizeGB)
    } else {
        Write-Host ("{0} -> (Not present)" -f $p)
    }
}
