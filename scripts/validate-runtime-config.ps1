[CmdletBinding()]
param(
  [string]$EnvFile = '.env',
  [switch]$Production,
  [switch]$SkipDocker,
  [switch]$SkipNode
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Add-ErrorMessage([string]$Message) {
  [void]$errors.Add($Message)
}

function Add-WarningMessage([string]$Message) {
  [void]$warnings.Add($Message)
}

function Read-DotEnv([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }
    if ($trimmed.StartsWith('export ')) {
      $trimmed = $trimmed.Substring(7).Trim()
    }
    if ($trimmed -notmatch '^(?<key>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$') {
      Add-WarningMessage "Ignoring unrecognized .env line."
      continue
    }
    $key = $Matches.key
    $value = $Matches.value.Trim()
    if ($value.Length -ge 2) {
      $first = $value.Substring(0, 1)
      $last = $value.Substring($value.Length - 1, 1)
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }
    $values[$key] = $value
  }
  return $values
}

function Get-Value([hashtable]$Values, [string]$Key) {
  if ($Values.ContainsKey($Key)) {
    return [string]$Values[$Key]
  }
  return ''
}

function Require-Value([hashtable]$Values, [string]$Key) {
  if ([string]::IsNullOrWhiteSpace((Get-Value $Values $Key))) {
    Add-ErrorMessage "$Key is missing or empty."
  }
}

function Validate-Boolean([hashtable]$Values, [string]$Key) {
  $value = (Get-Value $Values $Key).ToLowerInvariant()
  if ($value -and $value -notin @('true', 'false')) {
    Add-ErrorMessage "$Key must be true or false."
  }
}

function Validate-PositiveInteger([hashtable]$Values, [string]$Key) {
  $value = Get-Value $Values $Key
  if ($value -and (($value -notmatch '^\d+$') -or ([int]$value -le 0))) {
    Add-ErrorMessage "$Key must be a positive integer."
  }
}

$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile
} else {
  $candidate = Join-Path (Get-Location) $EnvFile
  if (Test-Path -LiteralPath $candidate) { $candidate } else { Join-Path $projectRoot $EnvFile }
}

if (-not (Test-Path -LiteralPath $envPath)) {
  Add-ErrorMessage "Environment file not found: $envPath"
  $values = @{}
} else {
  $values = Read-DotEnv $envPath
  Write-Host "Checking runtime configuration: $envPath"
}

@(
  'ADMIN_TOKEN',
  'ALLOWED_ORIGINS',
  'BACKEND_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SOCKET_URL'
) | ForEach-Object { Require-Value $values $_ }

if ((Get-Value $values 'NEXT_PUBLIC_API_URL') -and (Get-Value $values 'NEXT_PUBLIC_API_URL') -ne '/api') {
  Add-WarningMessage 'NEXT_PUBLIC_API_URL is not /api; verify that the browser proxy is intentionally bypassed.'
}

@(
  'AI_ADMIN_PERSISTENCE',
  'GLOBAL_AI_ENABLED',
  'AGENT_LEASE_MONITOR'
) | ForEach-Object { Validate-Boolean $values $_ }

@(
  'AGENT_HEARTBEAT_TIMEOUT_MS',
  'AGENT_LEASE_SWEEP_INTERVAL_MS',
  'AGENT_MAX_CHILDREN_PER_PARENT',
  'AGENT_MAX_TOTAL_AGENTS',
  'AGENT_MAX_CHILD_DEPTH'
) | ForEach-Object { Validate-PositiveInteger $values $_ }

if (-not $SkipNode) {
  $nodeVersion = ''
  try {
    $nodeVersion = (& node --version 2>$null).Trim()
  } catch {
    Add-ErrorMessage 'Node.js is not available on PATH.'
  }
  if ($nodeVersion -and $nodeVersion -notmatch '^v24\.') {
    Add-ErrorMessage "Node.js 24.x LTS is required for direct local execution; found $nodeVersion."
  }
}

if (-not $SkipDocker) {
  try {
    $null = & docker compose version 2>$null
  } catch {
    Add-ErrorMessage 'Docker Compose is not available or Docker Desktop is not running.'
  }
}

$nodeEnv = (Get-Value $values 'NODE_ENV').ToLowerInvariant()
if ($Production -or $nodeEnv -eq 'production') {
  if ($nodeEnv -ne 'production') {
    Add-ErrorMessage 'Production validation requires NODE_ENV=production.'
  }
  if ((Get-Value $values 'AI_CONTROL_ROOM_ENV').ToLowerInvariant() -ne 'production') {
    Add-ErrorMessage 'Production validation requires AI_CONTROL_ROOM_ENV=production.'
  }
  if ((Get-Value $values 'ADMIN_TOKEN').Length -lt 32) {
    Add-ErrorMessage 'ADMIN_TOKEN must contain at least 32 characters in production.'
  }
  if ((Get-Value $values 'ALLOWED_ORIGINS') -match 'localhost|127\.0\.0\.1') {
    Add-ErrorMessage 'ALLOWED_ORIGINS still points to localhost in production.'
  }
  if ((Get-Value $values 'NEXT_PUBLIC_SOCKET_URL') -match 'localhost|127\.0\.0\.1') {
    Add-ErrorMessage 'NEXT_PUBLIC_SOCKET_URL still points to localhost in production.'
  }
  if ((Get-Value $values 'AI_ADMIN_PERSISTENCE').ToLowerInvariant() -ne 'true') {
    Add-ErrorMessage 'AI_ADMIN_PERSISTENCE must be true for the canonical single-node runtime.'
  }
}

foreach ($warning in $warnings) {
  Write-Host "[WARN] $warning" -ForegroundColor Yellow
}
foreach ($errorMessage in $errors) {
  Write-Host "[ERROR] $errorMessage" -ForegroundColor Red
}

if ($errors.Count -gt 0) {
  Write-Host "Runtime configuration is NOT ready: $($errors.Count) error(s)." -ForegroundColor Red
  exit 1
}

Write-Host 'Runtime configuration is ready.' -ForegroundColor Green
exit 0
