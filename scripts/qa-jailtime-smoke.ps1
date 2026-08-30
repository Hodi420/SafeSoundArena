param(
  [switch]$EnableBrainEnrichment
)

$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$qaDir = Join-Path $env:TEMP ('safesound-qa-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $qaDir -Force | Out-Null
$stdoutPath = Join-Path $qaDir 'api.stdout.log'
$stderrPath = Join-Path $qaDir 'api.stderr.log'

$envBackup = @{}
foreach ($key in @(
  'PORT', 'HOST', 'NODE_ENV', 'ADMIN_TOKEN', 'ALLOWED_ORIGINS',
  'SAFESOUND_DATA_DIR', 'MSHIX_BRAIN_AUTO_ENRICH', 'OLLAMA_BASE_URL',
  'MSHIX_OUTBOX_REPLAY_INTERVAL_MS', 'AGENT_LEASE_MONITOR'
)) {
  $envBackup[$key] = [Environment]::GetEnvironmentVariable($key)
}

$env:PORT = '4100'
$env:HOST = '127.0.0.1'
$env:NODE_ENV = 'development'
$env:ADMIN_TOKEN = 'qa-admin'
$env:ALLOWED_ORIGINS = 'http://localhost:3000'
$env:SAFESOUND_DATA_DIR = $qaDir
$env:MSHIX_BRAIN_AUTO_ENRICH = if ($EnableBrainEnrichment) { 'true' } else { 'false' }
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
$env:MSHIX_OUTBOX_REPLAY_INTERVAL_MS = '0'
$env:AGENT_LEASE_MONITOR = 'false'

$proc = Start-Process `
  -FilePath (Get-Command node).Source `
  -ArgumentList 'backend/app.js' `
  -WorkingDirectory $workspace `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath

try {
  $health = $null
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/health' -TimeoutSec 2
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if ($null -eq $health) {
    throw "API did not become healthy. QA logs: $qaDir"
  }

  $headers = @{ Authorization = 'Bearer qa-admin' }
  $onBody = @{ active = $true } | ConvertTo-Json -Compress
  $offBody = @{ active = $false } | ConvertTo-Json -Compress
  $on = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:4100/api/jail' -Headers $headers -ContentType 'application/json' -Body $onBody
  $off = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:4100/api/jail' -Headers $headers -ContentType 'application/json' -Body $offBody
  $mshixHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/mshix/health' -Headers $headers -TimeoutSec 5
  $mshixOutbox = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/mshix/outbox/status' -Headers $headers -TimeoutSec 5
  $brainStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/mshix/brain/status' -Headers $headers -TimeoutSec 5
  $featureMutation = $null
  if ($EnableBrainEnrichment) {
    $featureMutation = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:4100/api/notifications/read-all' -Headers @{ 'X-User-Id' = 'qa-user' } -ContentType 'application/json' -Body '{}'
    for ($i = 0; $i -lt 240; $i++) {
      $brainStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/mshix/brain/status' -Headers $headers -TimeoutSec 5
      if ($brainStatus.metrics.enriched -gt 0 -and $brainStatus.queueDepth -eq 0) { break }
      Start-Sleep -Milliseconds 500
    }
  }
  $brainHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/mshix/brain/health' -Headers $headers -TimeoutSec 10
  $healthAfter = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/health' -TimeoutSec 5
  $logPath = Join-Path $qaDir 'jailtime-events.jsonl'
  $logLines = if (Test-Path -LiteralPath $logPath) { @(Get-Content -LiteralPath $logPath) } else { @() }

  [pscustomobject]@{
    qaDir = $qaDir
    healthStatusBefore = $health.status
    healthStatusAfter = $healthAfter.status
    jailOn = $on.active
    jailOff = $off.active
    jailLogStatus = $healthAfter.jailTimeLog.status
    jailLogCount = $healthAfter.jailTimeLog.count
    jailLogFileExists = Test-Path -LiteralPath $logPath
    jailLogLines = $logLines.Count
    mshixHealthStatus = $mshixHealth.status
    mshixOutboxCounts = $mshixOutbox.counts
    brainHealthStatus = $brainHealth.status
    brainProviderStatus = $brainHealth.provider.status
    brainEnriched = $brainStatus.metrics.enriched
    brainQueueDepth = $brainStatus.queueDepth
    featureMutationDelivery = if ($featureMutation) { $featureMutation.eventDelivery.status } else { 'not-run' }
    apiStderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
  } | ConvertTo-Json -Depth 6
} finally {
  if ($proc -and !$proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
  foreach ($key in $envBackup.Keys) {
    [Environment]::SetEnvironmentVariable($key, $envBackup[$key], 'Process')
  }
}
