# Scan for Python virtual environments on C: and D:

Write-Host "=== SCANNING C:\Users\Abhijit for Virtual Environments ==="
# Check typical venv locations: .virtualenvs, venvs, Projects, etc.
$cSearchDirs = @(
    "C:\Users\Abhijit\.virtualenvs",
    "C:\Users\Abhijit\venvs",
    "C:\Users\Abhijit\AppData\Local\virtualenvs",
    "C:\Users\Abhijit\AppData\Local\pypoetry\Cache\virtualenvs"
)

foreach ($d in $cSearchDirs) {
    if (Test-Path $d) {
        Get-ChildItem -Path $d -Directory | ForEach-Object {
            $py = Join-Path $_.FullName "Scripts\python.exe"
            if (Test-Path $py) {
                $sz = (Get-ChildItem -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                Write-Host ("Found venv on C: {0} ({1} MB)" -f $_.FullName, [math]::Round($sz/1MB, 2))
            }
        }
    } else {
        Write-Host ("{0} -> Not present" -f $d)
    }
}

Write-Host "`n=== SCANNING D: DIRECTORIES FOR PYTHON PROJECTS & VENVS ==="
$dDirs = Get-ChildItem -Path D:\ -Directory -Force

foreach ($dir in $dDirs) {
    $hasReq = Test-Path (Join-Path $dir.FullName "requirements.txt")
    $hasPyproject = Test-Path (Join-Path $dir.FullName "pyproject.toml")
    $hasPipfile = Test-Path (Join-Path $dir.FullName "Pipfile")
    $hasSetup = Test-Path (Join-Path $dir.FullName "setup.py")
    $hasEnvYml = Test-Path (Join-Path $dir.FullName "environment.yml")
    $hasPy = (Get-ChildItem -Path $dir.FullName -Filter "*.py" -Recurse -Depth 2 -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0

    # Look for venv / .venv / env
    $possibleVenvs = Get-ChildItem -Path $dir.FullName -Directory -Force -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match '^(venv|\.venv|env|\.env)$' -or (Test-Path (Join-Path $_.FullName "Scripts\python.exe"))
    }

    if ($hasReq -or $hasPyproject -or $hasPipfile -or $hasSetup -or $hasEnvYml -or $hasPy -or $possibleVenvs.Count -gt 0) {
        Write-Host ("Project: {0}" -f $dir.FullName)
        Write-Host ("  Requirements: req={0}, pyproject={1}, pipfile={2}, setup={3}, envYml={4}, pyFiles={5}" -f $hasReq, $hasPyproject, $hasPipfile, $hasSetup, $hasEnvYml, $hasPy)
        foreach ($v in $possibleVenvs) {
            $isVenv = Test-Path (Join-Path $v.FullName "Scripts\python.exe")
            if ($isVenv) {
                $vSize = (Get-ChildItem -Path $v.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                $pyVer = & (Join-Path $v.FullName "Scripts\python.exe") --version 2>&1
                Write-Host ("  Detected venv: {0} | Version: {1} | Size: {2} MB" -f $v.FullName, $pyVer, [math]::Round($vSize/1MB, 2))
            } else {
                Write-Host ("  Dir matching venv name (no python.exe): {0}" -f $v.FullName)
            }
        }
    }
}

Write-Host "`n=== CHECKING C:\Users\Abhijit\.cache CONTENTS ==="
if (Test-Path "C:\Users\Abhijit\.cache") {
    Get-ChildItem -Path "C:\Users\Abhijit\.cache" -Directory | ForEach-Object {
        $sz = (Get-ChildItem -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        Write-Host ("  .cache/{0} -> {1} MB" -f $_.Name, [math]::Round($sz/1MB, 2))
    }
}
