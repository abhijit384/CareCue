# CareCue Local Environment Inventory

Generated: 2026-09-18
Scope: Local host machine disk analysis, Python runtime discovery, virtual environments, and developer cache inspection.

---

## 1. Machine Storage Overview

| Drive | Total Capacity | Space Used | Free Space | Free % | Status |
|---|---|---|---|---|---|
| **C:** | 174.26 GB | 173.83 GB | **0.43 GB** | 0.25% | **CRITICAL: Near Full** |
| **D:** | 156.58 GB | 71.75 GB | **84.83 GB** | 54.18% | **Healthy: Primary Target for Venvs & Caches** |
| **E:** | 144.20 GB | 7.05 GB | **137.15 GB** | 95.11% | Available |

---

## 2. Python Runtimes & Global Environments

| Runtime Path | Version | Size on Disk | Notes |
|---|---|---|---|
| `C:\Users\Abhijit\AppData\Local\Python\bin\python.exe` | Python 3.14.6 | ~1.64 GB (core + site-packages) | Default system Python runtime |
| `C:\Users\Abhijit\AppData\Local\Microsoft\WindowsApps\python.exe` | 3.14.6 | Symlink wrapper | Windows Store execution alias |

*Note: No Conda or Mamba installations were detected on the machine.*

---

## 3. Project-by-Project Environment Inventory (D: Drive)

| Project | Path | Detected Venv Path | Python Version | Requirements Source | Venv Size | Active Usage | Recommended Action |
|---|---|---|---|---|---|---|---|
| **CareCue** | `D:\CareCue` | None (used global C: Python) | Python 3.14.6 | `D:\CareCue\backend\requirements.txt` | 0 MB (N/A) | Yes (Backend tests executed globally) | **Create `D:\venvs\carecue`**, install dependencies, verify backend tests, update configs |
| **CAREBRIDGE** | `D:\CAREBRIDGE` | `D:\CAREBRIDGE\.venv` | Python 3.14.6 | `D:\CAREBRIDGE\requirements.txt` | ~450.68 MB | Yes | Already on D: drive. Preserve in-place. Optionally link to `D:\venvs\carebridge` if centralized |
| **ProductIQ** | `D:\ProductIQ` | `D:\ProductIQ\.venv` | Python 3.14.6 | `D:\ProductIQ\backend\requirements.txt` | ~235.56 MB | Yes | Already on D: drive. Preserve in-place |
| **rescue-map-prototype** | `D:\rescue-map-prototype` | `D:\rescue-map-prototype\.venv` | Python 3.14.6 | None | ~11.80 MB | Inactive / Standalone | Already on D: drive. Preserve in-place |
| **Rime PS** | `D:\Rime PS` | `D:\Rime PS\backend\.venv` | Python 3.14.6 | `D:\Rime PS\backend\requirements.txt` | ~110.12 MB | Yes | Already on D: drive. Preserve in-place |
| **AI Fake Identity** | `D:\AI Fake Identity` | None | Python 3.14.6 | `D:\AI Fake Identity\backend\requirements.txt` | 0 MB | Unknown | Create `D:\venvs\ai-fake-identity` if requested; leave code untouched |
| **AI Business** | `D:\AI Business` | None | Python 3.14.6 | `D:\AI Business\...\requirements.txt` | 0 MB | Unknown | Leave untouched |
| **SOC Agent** | `D:\SOC Agent` | None | Python 3.14.6 | `D:\SOC Agent\backend\requirements.txt` | 0 MB | Unknown | Leave untouched |

---

## 4. Developer Caches on Drive C:

| Cache Identifier | Absolute Path | Size | Regenerable? | Safe to Relocate / Clean? | Recommended Strategy |
|---|---|---|---|---|---|
| **npm-cache** | `C:\Users\Abhijit\AppData\Local\npm-cache` | **3,290.77 MB (3.21 GB)** | Yes | Yes | Clear via `npm cache clean --force` or remove after setting npm cache to `D:\Caches\npm` |
| **pip-cache** | `C:\Users\Abhijit\AppData\Local\pip\cache` | **713.36 MB (0.70 GB)** | Yes | Yes | Relocate to `D:\Caches\pip` via `pip config set global.cache-dir D:\Caches\pip` |
| **puppeteer cache** | `C:\Users\Abhijit\.cache\puppeteer` | **696.77 MB (0.68 GB)** | Yes | Yes | Old browser binaries; safe to remove if unused |
| **codex-runtimes** | `C:\Users\Abhijit\.cache\codex-runtimes` | **1,333.88 MB (1.30 GB)** | Varies | Caution | Keep or verify before touching |
| **Windows Temp** | `C:\Users\Abhijit\AppData\Local\Temp` | **8.65 MB (0.01 GB)** | Yes | Yes | Negligible size |
| **System Temp** | `C:\Windows\Temp` | **0 MB** | System | No | Do not touch |

---

## 5. Summary of Recommended Actions

1. **Central Venv Directory**: Create `D:\venvs` as the single canonical home for all Python virtual environments.
2. **CareCue Venv**: Build `D:\venvs\carecue` with Python 3.14.6, install `boto3`, `pypdf`, `pytest`, run tests, and verify complete backend execution.
3. **Pip Cache Relocation**: Point pip cache to `D:\Caches\pip` using `pip config` so future pip installs on the host never consume C: drive space.
4. **Npm Cache Relocation & Cleanup**: Configure `npm config set cache D:\Caches\npm --global` and clean legacy `C:\Users\Abhijit\AppData\Local\npm-cache` to immediately recover ~3.2 GB of critical C: drive space.
5. **Validation**: Test CareCue backend, API, Bedrock/Gemini mock/real services, and frontend before finalizing.
