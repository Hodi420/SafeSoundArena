#!/bin/sh
#
# Read-only Ubuntu Mini-PC preflight for SafeSoundArena.
# It never pulls/builds images, creates volumes, changes networking, or starts
# or stops containers. A passing phase is evidence only, not deployment approval.

set -u
umask 077

errors=0
warnings=0
passes=0
not_run_count=0

pass() { passes=$((passes + 1)); printf '[PASS] %s\n' "$1"; }
warn() { warnings=$((warnings + 1)); printf '[WARN] %s\n' "$1"; }
fail() { errors=$((errors + 1)); printf '[ERROR] %s\n' "$1" >&2; }
not_run() { not_run_count=$((not_run_count + 1)); printf '[NOT_RUN] %s\n' "$1"; }

usage() {
  printf '%s\n' \
    'Usage: sh scripts/minipc-preflight.sh [--env-file PATH] [--phase repository|staged|running]' \
    '' \
    'Default PATH: .env.minipc under the repository root.' \
    'repository checks static contracts off-target.' \
    'staged requires a local Ubuntu Docker daemon and reviewed preloaded images.' \
    'running additionally verifies expected containers and semantic HTTP health.'
}

env_file=.env.minipc
phase=repository
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      if [ "$#" -lt 2 ]; then printf '[ERROR] --env-file requires a path.\n' >&2; exit 2; fi
      env_file=$2
      shift 2
      ;;
    --phase)
      if [ "$#" -lt 2 ]; then printf '[ERROR] --phase requires a value.\n' >&2; exit 2; fi
      phase=$2
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) printf '[ERROR] Unknown argument: %s\n' "$1" >&2; usage; exit 2 ;;
  esac
done
case "$phase" in repository|staged|running) ;; *) printf '[ERROR] Invalid phase.\n' >&2; usage; exit 2 ;; esac

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
base_compose="$project_root/docker-compose.yml"
minipc_compose="$project_root/docker-compose.minipc.yml"
frontend_config="$project_root/frontend/next.config.js"
case "$env_file" in /*) ;; *) env_file="$project_root/$env_file" ;; esac

printf '%s\n' 'SafeSoundArena Ubuntu Mini-PC preflight (read-only)'
printf 'Repository: %s\nEnvironment file: %s\nPhase: %s\n' "$project_root" "$env_file" "$phase"

if [ ! -f "$base_compose" ] || [ ! -f "$minipc_compose" ]; then
  printf '[ERROR] Canonical Compose file or Mini-PC overlay is missing.\n' >&2
  exit 1
fi
if [ ! -f "$env_file" ]; then
  printf '[ERROR] Environment file not found. Copy minipc.env.example to .env.minipc and fill it on the Mini-PC.\n' >&2
  exit 1
fi

# Parse dotenv without sourcing it, so values cannot execute shell syntax.
env_value() {
  awk -v wanted="$1" '
    { sub(/\r$/, "", $0) }
    /^[[:space:]]*($|#)/ { next }
    {
      line = $0
      sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      equals = index(line, "=")
      if (equals == 0) next
      name = substr(line, 1, equals - 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
      if (name != wanted) next
      value = substr(line, equals + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      if (length(value) >= 2) {
        first = substr(value, 1, 1)
        last = substr(value, length(value), 1)
        if ((first == "\"" && last == "\"") || (first == "\047" && last == "\047")) value = substr(value, 2, length(value) - 2)
      }
      print value
      exit
    }
  ' "$env_file"
}

is_placeholder() {
  printf '%s' "$1" | grep -Eiq '(^|[^a-z])(required|replace|changeme|change-me)([^a-z]|$)|[<>]'
}
valid_value() {
  candidate=$(env_value "$1")
  [ -n "$candidate" ] && ! is_placeholder "$candidate"
}
require_value() {
  value=$(env_value "$1")
  if [ -z "$value" ]; then fail "$1 is missing or empty."; elif is_placeholder "$value"; then fail "$1 still contains a placeholder."; else pass "$1 is recorded."; fi
}
host_platform() {
  case "$(uname -m 2>/dev/null || true)" in
    x86_64|amd64) printf '%s' linux/amd64 ;;
    aarch64|arm64) printf '%s' linux/arm64 ;;
    *) printf '%s' unknown ;;
  esac
}
version_at_least() {
  actual=$1
  required=$2
  awk -v actual="$actual" -v required="$required" '
    BEGIN {
      gsub(/^[vV]/, "", actual); gsub(/^[vV]/, "", required)
      split(actual, a, /[^0-9]+/); split(required, r, /[^0-9]+/)
      for (i = 1; i <= 3; i++) {
        av = (a[i] == "" ? 0 : a[i]) + 0; rv = (r[i] == "" ? 0 : r[i]) + 0
        if (av > rv) exit 0
        if (av < rv) exit 1
      }
      exit 0
    }
  '
}

duplicate_keys=$(awk '
  { sub(/\r$/, "", $0) }
  /^[[:space:]]*($|#)/ { next }
  {
    line = $0
    sub(/^[[:space:]]*export[[:space:]]+/, "", line)
    equals = index(line, "=")
    if (equals == 0) next
    name = substr(line, 1, equals - 1)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
    if (name ~ /^[A-Za-z_][A-Za-z0-9_]*$/) seen[name]++
  }
  END { for (name in seen) if (seen[name] > 1) print name }
' "$env_file")
if [ -n "$duplicate_keys" ]; then fail "Environment file has duplicate keys: $(printf '%s\n' "$duplicate_keys" | tr '\n' ' ')"; else pass 'Environment file has no duplicate keys.'; fi

managed_environment_clean=true
if command -v printenv >/dev/null 2>&1; then
  for key in COMPOSE_FILE COMPOSE_PROFILES COMPOSE_PROJECT_NAME DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH DOCKER_API_VERSION SAFESOUND_MINIPC_PLATFORM SAFESOUND_MINIPC_RELEASE_ID SAFESOUND_MINIPC_FEATURE_VOLUME NODE_ENV ADMIN_TOKEN ALLOWED_ORIGINS NEXT_PUBLIC_SOCKET_URL
  do
    if printenv "$key" >/dev/null 2>&1; then fail "Exported shell variable $key would override the checked file; unset it and rerun."; managed_environment_clean=false; fi
  done
else
  fail 'printenv is unavailable; environment overrides cannot be ruled out safely.'
  managed_environment_clean=false
fi

for key in SAFESOUND_MINIPC_HOSTNAME SAFESOUND_MINIPC_OS SAFESOUND_MINIPC_OS_VERSION SAFESOUND_MINIPC_PLATFORM SAFESOUND_MINIPC_ACCESS_MODE SAFESOUND_DOCKER_ENGINE_VERSION SAFESOUND_DOCKER_API_VERSION COMPOSE_PROJECT_NAME SAFESOUND_MINIPC_RELEASE_ID SAFESOUND_MINIPC_FEATURE_VOLUME SAFESOUND_MINIPC_EXPECT_EXISTING_DATA SAFESOUND_MINIPC_FEATURE_VOLUME_DRIVER SAFESOUND_MINIPC_MIN_FREE_GB SAFESOUND_MINIPC_MIN_TOTAL_RAM_MB SAFESOUND_MINIPC_MIN_AVAILABLE_RAM_MB NODE_ENV AI_CONTROL_ROOM_ENV ADMIN_TOKEN ALLOWED_ORIGINS NEXT_PUBLIC_SOCKET_URL
do
  require_value "$key"
done

if command -v stat >/dev/null 2>&1; then
  env_mode=$(stat -c '%a' "$env_file" 2>/dev/null || true)
  case "$env_mode" in 600|400) pass "Environment-file permissions are owner-only ($env_mode)." ;; '') warn 'Could not read environment-file permissions; verify mode 600 manually.' ;; *) fail "Environment-file permissions must be 600 or 400; found $env_mode." ;; esac
else
  warn 'stat is unavailable; verify environment-file permissions are owner-only manually.'
fi

if [ "$(env_value SAFESOUND_MINIPC_OS)" = Ubuntu ]; then pass 'Declared target OS is Ubuntu.'; else fail 'SAFESOUND_MINIPC_OS must be Ubuntu.'; fi
target_os_version=$(env_value SAFESOUND_MINIPC_OS_VERSION)
target_os_major=$(printf '%s' "$target_os_version" | sed -n 's/^[^0-9]*\([0-9][0-9]*\).*/\1/p')
if [ -n "$target_os_major" ] && [ "$target_os_major" -ge 22 ]; then pass "Declared Ubuntu version meets the 22.04+ baseline ($target_os_version)."; else fail 'SAFESOUND_MINIPC_OS_VERSION must be Ubuntu 22.04 or newer.'; fi
target_platform=$(env_value SAFESOUND_MINIPC_PLATFORM)
case "$target_platform" in linux/amd64|linux/arm64) pass "Declared target platform is $target_platform." ;; *) fail 'SAFESOUND_MINIPC_PLATFORM must be linux/amd64 or linux/arm64.' ;; esac

release_id=$(env_value SAFESOUND_MINIPC_RELEASE_ID)
if printf '%s' "$release_id" | grep -Eq '^[A-Fa-f0-9]{7,40}$'; then
  pass "Release identifier has a valid immutable-tag shape ($release_id)."
  current_sha=$(git -C "$project_root" rev-parse HEAD 2>/dev/null || true)
  case "$current_sha" in "$release_id"*) pass "Release identifier matches Git revision $current_sha." ;; *) fail 'Release identifier does not match the current Git revision.' ;; esac
else
  fail 'SAFESOUND_MINIPC_RELEASE_ID must be a 7-40 character hexadecimal Git SHA prefix.'
fi
if [ -z "$(git -C "$project_root" status --porcelain --untracked-files=normal 2>/dev/null)" ]; then pass 'The source tree is clean.'; else fail 'The source tree has tracked or untracked changes; rollback identity would be ambiguous.'; fi

if version_at_least "$(env_value SAFESOUND_DOCKER_ENGINE_VERSION)" 28.0.0; then pass 'Declared Docker Engine meets the 28+ baseline.'; else fail 'SAFESOUND_DOCKER_ENGINE_VERSION must be 28.0.0 or newer.'; fi
if printf '%s' "$(env_value ADMIN_TOKEN)" | grep -Eq '^[A-Fa-f0-9]{64,128}$'; then pass 'ADMIN_TOKEN is a 64-128 character hexadecimal secret (value not displayed).'; else fail 'ADMIN_TOKEN must be a 64-128 character hexadecimal secret.'; fi
if [ "$(env_value NODE_ENV)" = production ] && [ "$(env_value AI_CONTROL_ROOM_ENV)" = production ]; then pass 'Node and AI Control Room environments are production.'; else fail 'NODE_ENV and AI_CONTROL_ROOM_ENV must both be production.'; fi
case "$(env_value SAFESOUND_MINIPC_ACCESS_MODE)" in local-only|ssh-tunnel) pass 'Access mode is compatible with loopback-only publishing.' ;; *) fail 'SAFESOUND_MINIPC_ACCESS_MODE must be local-only or ssh-tunnel.' ;; esac
allowed_origins=$(env_value ALLOWED_ORIGINS)
if [ -n "$allowed_origins" ] && ! printf '%s' "$allowed_origins" | tr ',' '\n' | grep -Evq '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'; then pass 'Every allowed browser origin is loopback-only.'; else fail 'ALLOWED_ORIGINS must be explicit and loopback-only.'; fi
socket_url=$(env_value NEXT_PUBLIC_SOCKET_URL)
if printf '%s' "$socket_url" | grep -Eq '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'; then pass 'NEXT_PUBLIC_SOCKET_URL matches the loopback/tunnel profile.'; else fail 'NEXT_PUBLIC_SOCKET_URL must be an explicit loopback HTTP(S) URL.'; fi
if [ "$(env_value GLOBAL_AI_ENABLED)" = false ] && [ "$(env_value MSHIX_BRAIN_AUTO_ENRICH)" = false ]; then pass 'AI and Brain enrichment are disabled for the private baseline.'; else fail 'GLOBAL_AI_ENABLED and MSHIX_BRAIN_AUTO_ENRICH must both be false.'; fi
if [ "$(env_value OLLAMA_BASE_URL)" = http://127.0.0.1:11434 ]; then pass 'Ollama fallback is inert inside the API container.'; else fail 'OLLAMA_BASE_URL must be http://127.0.0.1:11434.'; fi
for key in PI_API_KEY AI_ADMIN_TOKEN AI_AGENT_TOKEN; do if [ -z "$(env_value "$key")" ]; then pass "$key is empty in the no-integration baseline."; else fail "$key must be empty in the no-integration baseline."; fi; done

if printf '%s' "$(env_value SAFESOUND_MINIPC_LOG_MAX_SIZE)" | grep -Eq '^[1-9][0-9]?[0-9]?m$'; then pass 'Container log size is bounded.'; else fail 'SAFESOUND_MINIPC_LOG_MAX_SIZE must be 1m-999m.'; fi
if printf '%s' "$(env_value SAFESOUND_MINIPC_LOG_MAX_FILES)" | grep -Eq '^[1-9][0-9]?$'; then pass 'Container log file count is bounded.'; else fail 'SAFESOUND_MINIPC_LOG_MAX_FILES must be 1-99.'; fi
min_free_gb=$(env_value SAFESOUND_MINIPC_MIN_FREE_GB)
min_total_ram_mb=$(env_value SAFESOUND_MINIPC_MIN_TOTAL_RAM_MB)
min_available_ram_mb=$(env_value SAFESOUND_MINIPC_MIN_AVAILABLE_RAM_MB)
for floor_key in SAFESOUND_MINIPC_MIN_FREE_GB SAFESOUND_MINIPC_MIN_TOTAL_RAM_MB SAFESOUND_MINIPC_MIN_AVAILABLE_RAM_MB; do
  floor_value=$(env_value "$floor_key")
  if printf '%s' "$floor_value" | grep -Eq '^[1-9][0-9]*$'; then pass "$floor_key is a positive whole-number floor."; else fail "$floor_key must be a positive whole number."; fi
done
case "$(env_value SAFESOUND_MINIPC_EXPECT_EXISTING_DATA)" in true|false) pass 'Existing-data expectation is explicit.' ;; *) fail 'SAFESOUND_MINIPC_EXPECT_EXISTING_DATA must be true or false.' ;; esac

project_name=$(env_value COMPOSE_PROJECT_NAME)
compose_minipc() {
  docker compose --env-file "$env_file" --project-name "$project_name" -f "$base_compose" -f "$minipc_compose" --profile minipc "$@"
}

compose_ready=false
if command -v docker >/dev/null 2>&1; then
  pass 'Docker CLI is available.'
  compose_version=$(docker compose version --short 2>/dev/null || true)
  if [ -n "$compose_version" ] && version_at_least "$compose_version" 2.24.4; then pass "Docker Compose supports !reset ($compose_version)."; compose_ready=true; else fail 'Docker Compose V2 2.24.4+ is required.'; fi
else
  fail 'Docker CLI is unavailable.'
fi

if [ "$managed_environment_clean" = true ] && [ "$compose_ready" = true ]; then
  if compose_minipc config --quiet >/dev/null 2>&1; then pass 'Canonical Compose plus Mini-PC overlay passes validation.'; else fail 'Canonical Compose plus Mini-PC overlay fails validation.'; fi
  rendered=$(compose_minipc config 2>/dev/null || true)
  active=$(compose_minipc config --services 2>/dev/null || true)
  for service in api-server frontend; do if printf '%s\n' "$active" | grep -Fxq "$service"; then pass "Profile activates required service $service."; else fail "Profile does not activate required service $service."; fi; done
  if printf '%s\n' "$active" | grep -Fxq ipfs; then fail 'IPFS is active in the private Mini-PC baseline.'; else pass 'IPFS is excluded from the private Mini-PC baseline.'; fi
  if printf '%s\n' "$rendered" | grep -Eq '^[[:space:]]*build:'; then fail 'Rendered Mini-PC services still contain build directives.'; else pass 'The !reset overlay removes every application build directive.'; fi
  if [ "$(printf '%s\n' "$rendered" | grep -Fc 'pull_policy: never' || true)" -eq 2 ]; then pass 'Every active service uses pull_policy=never.'; else fail 'Every active service must use pull_policy=never.'; fi
  if [ "$(printf '%s\n' "$rendered" | grep -Fc "platform: $target_platform" || true)" -eq 2 ]; then pass "Every active service is pinned to $target_platform."; else fail 'Active service platform declarations do not match the target.'; fi
  if printf '%s\n' "$rendered" | grep -Fq "image: safesoundarena-api:$release_id" && printf '%s\n' "$rendered" | grep -Fq "image: safesoundarena-frontend:$release_id"; then pass 'API and frontend image tags match the recorded release identifier.'; else fail 'API/frontend image tags do not match the recorded release identifier.'; fi
  if [ "$(printf '%s\n' "$rendered" | grep -Ec '^[[:space:]]*(cpus|mem_limit|mem_reservation|pids_limit):' || true)" -ge 8 ]; then pass 'Every active service has CPU, memory, reservation, and PID limits.'; else fail 'Each active service must have CPU, memory, reservation, and PID limits.'; fi
  if printf '%s\n' "$rendered" | grep -Fq 'internal: true'; then pass 'The application network is internal, blocking container egress outside this Compose network.'; else fail 'The Mini-PC application network must be internal.'; fi
  if [ "$(printf '%s\n' "$rendered" | grep -Fc 'host_ip: 127.0.0.1' || true)" -eq 2 ]; then pass 'All published application ports have explicit 127.0.0.1 host bindings.'; else fail 'Expected two loopback port bindings.'; fi
  if printf '%s\n' "$rendered" | grep -Eq 'privileged: true|/var/run/docker.sock'; then fail 'Privileged mode or a Docker socket mount is rendered.'; else pass 'No privileged mode or Docker socket mount is rendered.'; fi
  if printf '%s\n' "$rendered" | grep -Fq 'grep -Eq' && printf '%s\n' "$rendered" | grep -Fq 'restart: unless-stopped'; then pass 'Rendered services include restart policies and semantic API health checks.'; else fail 'Restart policy or semantic health check is missing.'; fi
  if [ -f "$frontend_config" ] && grep -Fq 'connect-src' "$frontend_config" && ! grep -Fq 'Access-Control-Allow-Origin' "$frontend_config"; then pass 'Frontend CSP includes explicit socket connect-src and no wildcard CORS header.'; else fail 'Frontend CSP/socket or CORS contract is missing.'; fi
else
  not_run 'Compose render checks are blocked by environment overrides or unavailable Compose V2.'
fi

if [ "$phase" = repository ]; then
  not_run 'Target hostname/OS, local Docker daemon, resource capacity, image identity, volumes and listeners are checked only in staged/running phases.'
  not_run 'Container identity and runtime health run only in the explicitly selected running phase.'
else
  if [ "$(uname -s 2>/dev/null || true)" = Linux ] && [ -r /etc/os-release ]; then pass 'Target host reports Linux with os-release metadata.'; else fail 'staged/running phases must run locally on the Ubuntu Mini-PC.'; fi
  if [ "$(host_platform)" = "$target_platform" ]; then pass "Target architecture matches $target_platform."; else fail 'Target architecture does not match the recorded target.'; fi
  detected_os=$(awk -F= '$1 == "ID" { gsub(/"/, "", $2); print $2; exit }' /etc/os-release 2>/dev/null || true)
  detected_version=$(awk -F= '$1 == "VERSION_ID" { gsub(/"/, "", $2); print $2; exit }' /etc/os-release 2>/dev/null || true)
  if [ "$detected_os" = ubuntu ] && [ "$detected_version" = "$target_os_version" ]; then pass 'Target Ubuntu identity exactly matches the recorded target.'; else fail 'Target Ubuntu identity does not exactly match the recorded target.'; fi
  if [ "$(hostname 2>/dev/null || true)" = "$(env_value SAFESOUND_MINIPC_HOSTNAME)" ]; then pass 'Target hostname exactly matches the recorded target.'; else fail 'Target hostname does not exactly match the recorded target.'; fi
  current_context=$(docker context show 2>/dev/null || true)
  endpoint=$(docker context inspect "$current_context" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)
  case "$endpoint" in unix://*) pass 'Docker context uses a local Unix socket.' ;; *) fail 'Docker context must use a local Unix socket.' ;; esac
  server_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)
  server_api=$(docker version --format '{{.Server.APIVersion}}' 2>/dev/null || true)
  if [ "$server_version" = "$(env_value SAFESOUND_DOCKER_ENGINE_VERSION)" ] && version_at_least "$server_version" 28.0.0; then pass 'Docker Engine exactly matches the recorded 28+ version.'; else fail 'Docker Engine does not exactly match the recorded 28+ version.'; fi
  if [ "$server_api" = "$(env_value SAFESOUND_DOCKER_API_VERSION)" ]; then pass 'Docker API exactly matches the recorded version.'; else fail 'Docker API does not exactly match the recorded version.'; fi
  docker_root=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)
  free_kb=$(df -Pk "$docker_root" 2>/dev/null | awk 'NR == 2 { print $4 }')
  if [ -n "$free_kb" ] && [ "$free_kb" -ge $(( min_free_gb * 1024 * 1024 )) ]; then pass 'Docker-root free capacity meets the recorded floor.'; else fail 'Docker-root free capacity is below the recorded floor.'; fi
  total_kb=$(awk '/^MemTotal:/ { print $2; exit }' /proc/meminfo 2>/dev/null || true)
  available_kb=$(awk '/^MemAvailable:/ { print $2; exit }' /proc/meminfo 2>/dev/null || true)
  if [ -n "$total_kb" ] && [ "$total_kb" -ge $(( min_total_ram_mb * 1024 )) ]; then pass 'Target total RAM meets the recorded floor.'; else fail 'Target total RAM is below the recorded floor.'; fi
  if [ -n "$available_kb" ] && [ "$available_kb" -ge $(( min_available_ram_mb * 1024 )) ]; then pass 'Target available RAM meets the recorded floor.'; else fail 'Target available RAM is below the recorded floor.'; fi
  api_image="safesoundarena-api:$release_id"
  frontend_image="safesoundarena-frontend:$release_id"
  for image_key in api frontend; do
    case "$image_key" in api) image=$api_image; expected_id=$(env_value SAFESOUND_MINIPC_API_IMAGE_ID); socket_label='' ;; frontend) image=$frontend_image; expected_id=$(env_value SAFESOUND_MINIPC_FRONTEND_IMAGE_ID); socket_label=$socket_url ;; esac
    if ! printf '%s' "$expected_id" | grep -Eq '^sha256:[A-Fa-f0-9]{64}$'; then fail "Recorded $image_key image ID must be an exact sha256 ID."; continue; fi
    actual_id=$(docker image inspect "$image" --format '{{.Id}}' 2>/dev/null || true)
    if [ "$actual_id" = "$expected_id" ]; then pass "$image tag resolves to the recorded image ID."; else fail "$image tag does not resolve to the recorded image ID."; continue; fi
    image_platform=$(docker image inspect "$image" --format '{{.Os}}/{{.Architecture}}' 2>/dev/null || true)
    if [ "$image_platform" = "$target_platform" ]; then pass "$image platform matches the target."; else fail "$image platform does not match the target."; fi
    revision=$(docker image inspect "$image" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' 2>/dev/null || true)
    if [ "$revision" = "$release_id" ] || [ "$revision" = "$(git -C "$project_root" rev-parse HEAD 2>/dev/null || true)" ]; then pass "$image has the recorded source revision label."; else fail "$image lacks the recorded source revision label."; fi
    if [ -n "$socket_label" ]; then
      image_socket=$(docker image inspect "$image" --format '{{ index .Config.Labels "io.safesoundarena.next-public-socket-url" }}' 2>/dev/null || true)
      if [ "$image_socket" = "$socket_label" ]; then pass 'Frontend image socket label matches the browser URL.'; else fail 'Frontend image socket label does not match NEXT_PUBLIC_SOCKET_URL.'; fi
    fi
  done
  feature_volume=$(env_value SAFESOUND_MINIPC_FEATURE_VOLUME)
  if [ "$(env_value SAFESOUND_MINIPC_EXPECT_EXISTING_DATA)" = true ]; then
    if docker volume inspect "$feature_volume" >/dev/null 2>&1; then pass 'Expected feature-data volume exists.'; else fail 'Expected feature-data volume is absent.'; fi
    volume_driver=$(docker volume inspect "$feature_volume" --format '{{.Driver}}' 2>/dev/null || true)
    volume_mountpoint=$(docker volume inspect "$feature_volume" --format '{{.Mountpoint}}' 2>/dev/null || true)
    if [ "$volume_driver" = "$(env_value SAFESOUND_MINIPC_FEATURE_VOLUME_DRIVER)" ]; then pass 'Feature-data volume driver matches the recorded target.'; else fail 'Feature-data volume driver does not match the recorded target.'; fi
    if valid_value SAFESOUND_MINIPC_FEATURE_VOLUME_MOUNTPOINT && [ "$volume_mountpoint" = "$(env_value SAFESOUND_MINIPC_FEATURE_VOLUME_MOUNTPOINT)" ]; then pass 'Feature-data volume mountpoint matches the recorded target.'; else fail 'Feature-data volume mountpoint is missing or does not match the recorded target.'; fi
  elif docker volume inspect "$feature_volume" >/dev/null 2>&1; then
    fail 'Feature-data volume already exists while SAFESOUND_MINIPC_EXPECT_EXISTING_DATA=false.'
  else
    pass 'Fresh feature-data volume is absent as expected; preflight will not create it.'
  fi
  for port in 3000 4000; do if command -v ss >/dev/null 2>&1 && ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then fail "Host port $port is already listening before start."; else pass "Host port $port is free before start."; fi; done
  if [ "$phase" = running ]; then
    for service in api-server frontend; do
      container_id=$(compose_minipc ps -q "$service" 2>/dev/null || true)
      if [ -z "$container_id" ]; then fail "Expected running Compose service $service is absent."; continue; fi
      case "$service" in api-server) expected_id=$(env_value SAFESOUND_MINIPC_API_IMAGE_ID) ;; frontend) expected_id=$(env_value SAFESOUND_MINIPC_FRONTEND_IMAGE_ID) ;; esac
      if [ "$(docker inspect "$container_id" --format '{{.Image}}' 2>/dev/null || true)" = "$expected_id" ]; then pass "$service uses its recorded image ID."; else fail "$service does not use its recorded image ID."; fi
      health=$(docker inspect "$container_id" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' 2>/dev/null || true)
      if [ "$health" = healthy ]; then pass "$service reports healthy."; else fail "$service health is not healthy."; fi
    done
    if command -v curl >/dev/null 2>&1 && curl -fsS http://127.0.0.1:4000/api/health 2>/dev/null | grep -Eq '^[[:space:]]*\{[[:space:]]*"status"[[:space:]]*:[[:space:]]*"ok"'; then pass 'API health endpoint reports JSON status=ok.'; else fail 'API health endpoint does not report JSON status=ok.'; fi
    if command -v curl >/dev/null 2>&1 && curl -fsS http://127.0.0.1:3000/api/health 2>/dev/null | grep -Eq '^[[:space:]]*\{[[:space:]]*"status"[[:space:]]*:[[:space:]]*"ok"'; then pass 'Frontend proxy health endpoint reports JSON status=ok.'; else fail 'Frontend proxy health endpoint does not report JSON status=ok.'; fi
  else
    not_run 'Container identity and runtime health run only in the explicitly selected running phase.'
  fi
fi

printf '\nSummary: %s pass, %s warning(s), %s not-run gate(s), %s error(s).\n' "$passes" "$warnings" "$not_run_count" "$errors"
if [ "$errors" -ne 0 ]; then
  printf '%s\n' 'MINI-PC PREFLIGHT FAILED. No deployment action was taken.'
  exit 1
fi
if [ "$phase" = repository ]; then
  printf '%s\n' 'MINI-PC STATIC PREFLIGHT PASSED WITH RUNTIME GATES NOT RUN. This is not deployment or acceptance authorization.'
else
  printf '%s\n' 'MINI-PC PREFLIGHT PASSED FOR THE SELECTED PHASE. Separate approval and acceptance evidence are still required.'
fi
