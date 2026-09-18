# Detailed inventory script

Write-Host "=== 1. DISK DRIVES ==="
Get-CimInstance Win32_LogicalDisk | ForEach-Object {
    $freeGB = [math]::Round($_.FreeSpace / 1GB, 2)
    $sizeGB = [math]::Round($_.Size / 1GB, 2)
    $usedGB = [math]::Round(($_.Size - $_.FreeSpace) / 1GB, 2)
    Write-Host ("Drive {0} Size: {1} GB | Used: {2} GB | Free: {3} GB" -f $_.DeviceID, $sizeGB, $usedGB, $freeGB)
}

Write-Host "`n=== 2. PYTHON INSTALLATIONS ==="
Get-Command python -All -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("Executable: {0}" -f $_.Source)
}
$pyCore = "C:\Users\Abhijit\AppData\Local\Python"
if (Test-Path $pyCore) {
    $sz = (Get-ChildItem -Path $pyCore -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host ("{0} -> {1} MB ({2} GB)" -f $pyCore, [math]::Round($sz/1MB, 2), [math]::Round($sz/1GB, 2))
}

Write-Host "`n=== 3. DEVELOPER CACHES ON C: ==="
$caches = @(
    "C:\Users\Abhijit\AppData\Local\npm-cache",
    "C:\Users\Abhijit\AppData\Local\pip\cache",
    "C:\Users\Abhijit\.cache",
    "C:\Users\Abhijit\AppData\Local\Temp",
    "C:\Windows\Temp"
)

foreach ($c in $caches) {
    if (Test-Path $c) {
        $sz = (Get-ChildItem -Path $c -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        Write-Host ("{0} -> {1} MB ({2} GB)" -f $c, [math]::Round($sz/1MB, 2), [math]::Round($sz/1GB, 2))
    }
}

Write-Host "`n=== 4. DETAILED PROJECT AUDIT ON D: ==="
$dDirs = Get-ChildItem -Path D:\ -Directory -Force

foreach ($dir in $dDirs) {
    $reqFiles = Get-ChildItem -Path $dir.FullName -Recurse -Depth 3 -Filter "requirements*.txt" -ErrorAction SilentlyContinue
    $pyprojectFiles = Get-ChildItem -Path $dir.FullName -Recurse -Depth 3 -Filter "pyproject.toml" -ErrorAction SilentlyContinue
    $pipfileFiles = Get-ChildItem -Path $dir.FullName -Recurse -Depth 3 -Filter "Pipfile" -ErrorAction SilentlyContinue
    $setupFiles = Get-ChildItem -Path $dir.FullName -Recurse -Depth 3 -Filter "setup.py" -ErrorAction SilentlyContinue
    $envYmlFiles = Get-ChildItem -Path $dir.FullName -Recurse -Depth 3 -Filter "*environment*.yml" -ErrorAction SilentlyContinue
    
    # Check for venvs anywhere in the project up to depth 3
    $venvs = Get-ChildItem -Path $dir.FullName -Recurse -Depth 3 -Directory -Force -ErrorAction SilentlyContinue | Where-Object {
        Test-Path (Join-Path $_.FullName "Scripts\python.exe")
    }

    $isPyProject = ($reqFiles.Count -gt 0) -or ($pyprojectFiles.Count -gt 0) -or ($pipfileFiles.Count -gt 0) -or ($setupFiles.Count -gt 0) -or ($envYmlFiles.Count -gt 0) -or ($venvs.Count -gt 0)

    if ($isPyProject) {
        Write-Host ("`nProject: {0}" -f $dir.FullName)
        if ($reqFiles) { Write-Host ("  Requirements files: " + ($reqFiles.FullName -join ", ")) }
        if ($pyprojectFiles) { Write-Host ("  Pyproject files: " + ($pyprojectFiles.FullName -join ", ")) }
        if ($pipfileFiles) { Write-Host ("  Pipfiles: " + ($pipfileFiles.FullName -join ", ")) }
        if ($setupFiles) { Write-Host ("  Setup files: " + ($setupFiles.FullName -join ", ")) }
        if ($envYmlFiles) { Write-Host ("  Env YAML files: " + ($envYmlFiles.FullName -join ", ")) }

        if ($venvs.Count -gt 0) {
            foreach ($v in $venvs) {
                $vSz = (Get-ChildItem -Path $v.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                $pyExe = Join-Path $v.FullName "Scripts\python.exe"
                $ver = & $pyExe --version 2>&1
                Write-Host ("  Found venv: {0} | Version: {1} | Size: {2} MB" -f $v.FullName, $ver, [math]::Round($vSz/1MB, 2))
            }
        } else {
            Write-Host ("  No dedicated venv found inside project folder.")
        }
    }
}
