# Safe cache cleanup script

$cBefore = (Get-CimInstance Win32_LogicalDisk | Where-Object DeviceID -eq 'C:').FreeSpace
$dBefore = (Get-CimInstance Win32_LogicalDisk | Where-Object DeviceID -eq 'D:').FreeSpace

Write-Host "Cleaning legacy npm cache on C: (3.21 GB)..."
if (Test-Path "C:\Users\Abhijit\AppData\Local\npm-cache") {
    Remove-Item -Path "C:\Users\Abhijit\AppData\Local\npm-cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed C:\Users\Abhijit\AppData\Local\npm-cache"
}

Write-Host "Cleaning legacy pip cache on C: (0.70 GB)..."
if (Test-Path "C:\Users\Abhijit\AppData\Local\pip\cache") {
    Remove-Item -Path "C:\Users\Abhijit\AppData\Local\pip\cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed C:\Users\Abhijit\AppData\Local\pip\cache"
}

$cAfter = (Get-CimInstance Win32_LogicalDisk | Where-Object DeviceID -eq 'C:').FreeSpace
$dAfter = (Get-CimInstance Win32_LogicalDisk | Where-Object DeviceID -eq 'D:').FreeSpace

$recoveredC_GB = [math]::Round(($cAfter - $cBefore) / 1GB, 2)
$recoveredC_MB = [math]::Round(($cAfter - $cBefore) / 1MB, 2)

Write-Host "`n=== RESULTS ==="
Write-Host ("C: Drive Free Space Before: {0} GB" -f [math]::Round($cBefore / 1GB, 2))
Write-Host ("C: Drive Free Space After:  {0} GB" -f [math]::Round($cAfter / 1GB, 2))
Write-Host ("C: Space Recovered:         {0} GB ({1} MB)" -f $recoveredC_GB, $recoveredC_MB)
Write-Host ("D: Drive Free Space Before: {0} GB" -f [math]::Round($dBefore / 1GB, 2))
Write-Host ("D: Drive Free Space After:  {0} GB" -f [math]::Round($dAfter / 1GB, 2))
