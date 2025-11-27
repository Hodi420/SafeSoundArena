# Runs project code checks: JS syntax (node --check), TypeScript (tsc --noEmit), and tests (mocha).
# Usage: pwsh -NoProfile -File .\scripts\check-code.ps1

$ErrorActionPreference = 'Stop'
$failures = @()

Write-Host "=== Environment ===" -ForegroundColor Yellow
try {
    node -v | ForEach-Object { Write-Host "node: $_" }
} catch {}
try {
    npm -v | ForEach-Object { Write-Host "npm: $_" }
} catch {}
try {
    npx -v | ForEach-Object { Write-Host "npx: $_" }
} catch {}

Write-Host "=== 1) JavaScript syntax check (node --check) ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Filter '*.js' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' } |
    ForEach-Object {
        $path = $_.FullName
        Write-Host "---- $path"
        try {
            node --check $path 2>&1 | ForEach-Object { if ($_ -ne '') { Write-Host $_ } }
            if ($LASTEXITCODE -ne 0) { $failures += "JS-syntax: $path" }
        } catch {
            Write-Host "Error checking ${path}: $($_)"
            $failures += "JS-syntax: ${path}"
        }
    }

Write-Host "`n=== 2) TypeScript check (npx tsc --noEmit) ===" -ForegroundColor Cyan
try {
    npx -y tsc --noEmit 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { $failures += 'tsc' }
} catch {
    Write-Host "tsc failed to run: $($_)"
    $failures += 'tsc'
}

Write-Host "`n=== 3) Run tests (npx mocha --exit) ===" -ForegroundColor Cyan
try {
    npx -y mocha --exit 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { $failures += 'mocha' }
} catch {
    Write-Host "mocha failed to run: $($_)"
    $failures += 'mocha'
}

if ($failures.Count -gt 0) {
    Write-Host "`nChecks finished: FAILURES found:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host " - $_" }
    exit 1
} else {
    Write-Host "`nChecks finished: All OK" -ForegroundColor Green
    exit 0
}
