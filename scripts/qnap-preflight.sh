#!/bin/sh
#
# Read-only QNAP/Container Station preflight for SafeSoundArena.
# It validates configuration and existing host state. It never pulls, builds,
# creates volumes, changes networking, or starts/stops containers.

set -u
umask 077

errors=0
warnings=0
passes=0
not_run_count=0

pass() {
  passes=$((passes + 1))
  printf '[PASS] %s\n' "$1"
}

warn() {
  warnings=$((warnings + 1))
  printf '[WARN] %s\n' "$1"
}

fail() {
  errors=$((errors + 1))
  printf '[ERROR] %s\n' "$1" >&2
}

not_run() {
  not_run_count=$((not_run_count + 1))
  printf '[NOT_RUN] %s\n' "$1"
}

usage() {
  printf '%s\n' \
    'Usage: sh scripts/qnap-preflight.sh [--env-file PATH] [--phase repository|staged|running]' \
    '' \
    'Default PATH: .env.qnap under the repository root.' \
    'Default phase: repository (off-target/static checks only).' \
    'staged requires a local QNAP daemon and preloaded, identity-locked images.' \
    'running additionally verifies the expected Compose containers and HTTP health.' \
    'This command is read-only and does not authorize deployment.'
}

env_file='.env.qnap'
phase='repository'
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      if [ "$#" -lt 2 ]; then
        printf '[ERROR] --env-file requires a path.\n' >&2
        usage
        exit 2
      fi
      env_file=$2
      shift 2
      ;;
    --phase)
      if [ "$#" -lt 2 ]; then
        printf '[ERROR] --phase requires repository, staged, or running.\n' >&2
        usage
        exit 2
      fi
      phase=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf '[ERROR] Unknown argument: %s\n' "$1" >&2
      usage
      exit 2
      ;;
  esac
done

case "$phase" in
  repository|staged|running) ;;
  *)
    printf '[ERROR] --phase must be repository, staged, or running.\n' >&2
    usage
    exit 2
    ;;
esac

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
base_compose="$project_root/docker-compose.yml"
qnap_compose="$project_root/docker-compose.qnap.yml"
frontend_config="$project_root/frontend/next.config.js"

case "$env_file" in
  /*) ;;
  *) env_file="$project_root/$env_file" ;;
esac

printf '%s\n' 'SafeSoundArena QNAP preflight (read-only)'
printf 'Repository: %s\n' "$project_root"
printf 'Environment file: %s\n' "$env_file"
printf 'Phase: %s\n' "$phase"

if [ ! -f "$base_compose" ] || [ ! -f "$qnap_compose" ]; then
  printf '[ERROR] Canonical Compose file or QNAP overlay is missing.\n' >&2
  exit 1
fi

if [ ! -f "$env_file" ]; then
  printf '[ERROR] Environment file not found. Copy qnap.env.example to .env.qnap and fill it on the NAS.\n' >&2
  exit 1
fi

# Parse dotenv data without sourcing it. Sourcing would execute shell syntax.
env_value() {
  awk -v wanted="$1" '
    {
      sub(/\r$/, "", $0)
    }
    /^[[:space:]]*($|#)/ {
      next
    }
    {
      line = $0
      sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      equals = index(line, "=")
      if (equals == 0) {
        next
      }
      name = substr(line, 1, equals - 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
      if (name != wanted) {
        next
      }
      value = substr(line, equals + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      if (length(value) >= 2) {
        first = substr(value, 1, 1)
        last = substr(value, length(value), 1)
        if ((first == "\"" && last == "\"") || (first == "\047" && last == "\047")) {
          value = substr(value, 2, length(value) - 2)
        }
      }
      print value
      exit
    }
  ' "$env_file"
}

duplicate_keys=$(awk '
  {
    sub(/\r$/, "", $0)
  }
  /^[[:space:]]*($|#)/ {
    next
  }
  {
    line = $0
    sub(/^[[:space:]]*export[[:space:]]+/, "", line)
    equals = index(line, "=")
    if (equals == 0) {
      next
    }
    name = substr(line, 1, equals - 1)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
    if (name ~ /^[A-Za-z_][A-Za-z0-9_]*$/) {
      seen[name]++
    }
  }
  END {
    for (name in seen) {
      if (seen[name] > 1) {
        print name
      }
    }
  }
' "$env_file")
if [ -n "$duplicate_keys" ]; then
  duplicate_list=$(printf '%s\n' "$duplicate_keys" | tr '\n' ' ')
  fail "Environment file contains duplicate keys: $duplicate_list"
else
  pass 'Environment file has no duplicate keys.'
fi

# Compose gives exported shell variables precedence over --env-file. Reject
# managed overrides so the values checked below are the values Compose renders.
managed_environment_clean=true
docker_endpoint_environment_clean=true
if command -v printenv >/dev/null 2>&1; then
  for key in \
  COMPOSE_FILE COMPOSE_PROFILES COMPOSE_PROJECT_NAME \
  DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH DOCKER_API_VERSION \
  SAFESOUND_QNAP_PLATFORM SAFESOUND_QNAP_RELEASE_ID \
  SAFESOUND_QNAP_FEATURE_VOLUME SAFESOUND_QNAP_IPFS_VOLUME \
  SAFESOUND_QNAP_IPFS_IMAGE SAFESOUND_QNAP_LOG_MAX_SIZE \
  SAFESOUND_QNAP_LOG_MAX_FILES PI_API_KEY NODE_ENV ADMIN_TOKEN \
  ALLOWED_ORIGINS AI_CONTROL_ROOM_ENV GLOBAL_AI_ENABLED AI_ADMIN_TOKEN \
  AI_AGENT_TOKEN AI_ADMIN_AUDIT_LOG_PATH AI_ADMIN_PERSISTENCE \
  AI_ADMIN_RUNTIME_STATE_PATH AGENT_LEASE_MONITOR \
  AGENT_HEARTBEAT_TIMEOUT_MS AGENT_LEASE_SWEEP_INTERVAL_MS \
  AGENT_MAX_CHILDREN_PER_PARENT AGENT_MAX_TOTAL_AGENTS \
  AGENT_MAX_CHILD_DEPTH MSHIX_MAX_EVENT_BYTES MSHIX_EVENT_HISTORY_LIMIT \
  MSHIX_HANDLER_TIMEOUT_MS MSHIX_ALLOW_UNAUTHENTICATED_DEV \
  MSHIX_BRAIN_AUTO_ENRICH MSHIX_BRAIN_STORE_PAYLOAD \
  MSHIX_BRAIN_CHAT_MODEL MSHIX_BRAIN_EMBED_MODEL \
  MSHIX_BRAIN_MAX_MEMORIES MSHIX_BRAIN_QUEUE_LIMIT \
  MSHIX_BRAIN_STORE_PATH MSHIX_OUTBOX_PATH MSHIX_OUTBOX_MAX_ENTRIES \
  MSHIX_OUTBOX_MAX_ATTEMPTS MSHIX_OUTBOX_RETRY_BASE_MS \
  MSHIX_OUTBOX_DISPATCH_LEASE_MS MSHIX_OUTBOX_REPLAY_INTERVAL_MS \
  MSHIX_OUTBOX_REPLAY_BATCH OLLAMA_BASE_URL OLLAMA_MODEL \
  OLLAMA_REQUEST_TIMEOUT_MS NEXT_PUBLIC_SOCKET_URL
  do
    if printenv "$key" >/dev/null 2>&1; then
      fail "Exported shell variable $key would override the checked environment file; unset it and rerun."
      managed_environment_clean=false
      case "$key" in
        DOCKER_*) docker_endpoint_environment_clean=false ;;
      esac
    fi
  done
else
  managed_environment_clean=false
  docker_endpoint_environment_clean=false
  fail 'printenv is unavailable; exported Compose/Docker endpoint overrides cannot be ruled out safely.'
fi

is_placeholder() {
  printf '%s' "$1" | grep -Eiq '(^|[^a-z])(required|replace|changeme|change-me)([^a-z]|$)|[<>]'
}

recorded_inputs_invalid=false
require_recorded_value() {
  key=$1
  value=$(env_value "$key")
  if [ -z "$value" ]; then
    fail "$key is missing or empty."
    recorded_inputs_invalid=true
  elif is_placeholder "$value"; then
    fail "$key still contains a placeholder."
    recorded_inputs_invalid=true
  else
    pass "$key is recorded."
  fi
}

recorded_value_is_valid() {
  candidate_value=$(env_value "$1")
  [ -n "$candidate_value" ] && ! is_placeholder "$candidate_value"
}

for key in \
  SAFESOUND_QNAP_MODEL \
  SAFESOUND_QNAP_OS \
  SAFESOUND_QNAP_OS_VERSION \
  SAFESOUND_QNAP_OS_BUILD \
  SAFESOUND_CONTAINER_STATION_VERSION \
  SAFESOUND_DOCKER_ENGINE_VERSION \
  SAFESOUND_DOCKER_API_VERSION \
  SAFESOUND_QNAP_PLATFORM \
  SAFESOUND_QNAP_ACCESS_MODE \
  COMPOSE_PROJECT_NAME \
  SAFESOUND_QNAP_RELEASE_ID \
  SAFESOUND_QNAP_FEATURE_VOLUME \
  SAFESOUND_QNAP_IPFS_VOLUME \
  SAFESOUND_QNAP_FEATURE_VOLUME_DRIVER \
  SAFESOUND_QNAP_MIN_TOTAL_RAM_MB \
  SAFESOUND_QNAP_MIN_AVAILABLE_RAM_MB \
  NODE_ENV \
  AI_CONTROL_ROOM_ENV \
  ADMIN_TOKEN \
  ALLOWED_ORIGINS \
  NEXT_PUBLIC_SOCKET_URL
do
  require_recorded_value "$key"
done

if [ "$phase" != repository ]; then
  require_recorded_value SAFESOUND_QNAP_API_IMAGE_ID
  require_recorded_value SAFESOUND_QNAP_FRONTEND_IMAGE_ID
fi

if command -v stat >/dev/null 2>&1; then
  env_mode=$(stat -c '%a' "$env_file" 2>/dev/null || true)
  case "$env_mode" in
    ''|*[!0-7]*)
      warn 'Could not interpret environment-file permissions; verify that only the NAS operator can read it.'
      ;;
    *)
      if [ $((env_mode % 100)) -eq 0 ]; then
        pass "Environment-file permissions are owner-only ($env_mode)."
      else
        fail "Environment file is group/world accessible (mode $env_mode); use chmod 600."
      fi
      ;;
  esac
else
  warn 'stat is unavailable; verify .env.qnap permissions manually (expected mode 600).'
fi

qnap_os=$(env_value SAFESOUND_QNAP_OS)
if recorded_value_is_valid SAFESOUND_QNAP_OS; then
  case "$qnap_os" in
    QTS|'QuTS hero'|QuTS-hero)
      pass "Declared NAS OS is $qnap_os."
      ;;
    *)
      fail 'SAFESOUND_QNAP_OS must be QTS or QuTS hero.'
      ;;
  esac
else
  not_run 'Declared QNAP OS validation is blocked by a missing/placeholder value.'
fi

qnap_os_version=$(env_value SAFESOUND_QNAP_OS_VERSION)
qnap_os_build=$(env_value SAFESOUND_QNAP_OS_BUILD)
if recorded_value_is_valid SAFESOUND_QNAP_OS_VERSION; then
  os_pair=$(printf '%s' "$qnap_os_version" | sed -n 's/^[^0-9]*\([0-9][0-9]*\)\.\([0-9][0-9]*\).*/\1 \2/p')
  if [ -z "$os_pair" ]; then
    fail 'Could not parse SAFESOUND_QNAP_OS_VERSION.'
  else
    set -- $os_pair
    if [ "$1" -gt 5 ] || { [ "$1" -eq 5 ] && [ "$2" -ge 1 ]; }; then
      pass "Declared QNAP OS version meets the 5.1+ baseline ($qnap_os_version)."
    else
      fail "QNAP OS 5.1+ is required; declared $qnap_os_version."
    fi
  fi
else
  not_run 'Declared QNAP OS version validation is blocked by a missing/placeholder value.'
fi

container_station_version=$(env_value SAFESOUND_CONTAINER_STATION_VERSION)
if recorded_value_is_valid SAFESOUND_CONTAINER_STATION_VERSION; then
  cs_major=$(printf '%s' "$container_station_version" | sed -n 's/^[^0-9]*\([0-9][0-9]*\).*/\1/p')
  if [ -z "$cs_major" ]; then
    fail 'Could not parse SAFESOUND_CONTAINER_STATION_VERSION.'
  elif [ "$cs_major" -lt 3 ]; then
    fail "Container Station 3+ is required; declared $container_station_version."
  else
    pass "Declared Container Station version meets the 3+ baseline ($container_station_version)."
  fi
else
  not_run 'Declared Container Station validation is blocked by a missing/placeholder value.'
fi

declared_qnap_model=$(env_value SAFESOUND_QNAP_MODEL)
if command -v getcfg >/dev/null 2>&1; then
  detected_qnap_model=$(getcfg System Model -f /etc/config/uLinux.conf 2>/dev/null || true)
  detected_qnap_version=$(getcfg System Version -f /etc/config/uLinux.conf 2>/dev/null || true)
  detected_qnap_build=$(getcfg System 'Build Number' -f /etc/config/uLinux.conf 2>/dev/null || true)
  detected_cs_version=$(getcfg container-station Version -f /etc/config/qpkg.conf 2>/dev/null || true)
  if [ -n "$detected_qnap_model" ]; then
    if [ "$declared_qnap_model" = "$detected_qnap_model" ]; then
      pass "QNAP model exactly matches the recorded target ($detected_qnap_model)."
    else
      fail "Recorded QNAP model $declared_qnap_model does not exactly match detected model $detected_qnap_model."
    fi
  elif [ "$phase" = repository ]; then
    warn 'QNAP model could not be read with getcfg; target identity is not verified in repository phase.'
  else
    fail 'QNAP model could not be read with getcfg; staged/running checks require target identity.'
  fi
  if [ -n "$detected_qnap_version" ]; then
    pass "QNAP reported OS version $detected_qnap_version build ${detected_qnap_build:-unknown}."
    if [ "$qnap_os_version" = "$detected_qnap_version" ]; then
      pass 'QNAP OS version exactly matches the recorded target.'
    else
      fail 'Recorded QNAP OS version does not exactly match the version reported by the NAS.'
    fi
    if [ -n "$detected_qnap_build" ] && [ "$qnap_os_build" = "$detected_qnap_build" ]; then
      pass 'QNAP OS build exactly matches the recorded target.'
    elif [ -z "$detected_qnap_build" ]; then
      fail 'QNAP OS build could not be read from uLinux.conf.'
    else
      fail 'Recorded QNAP OS build does not exactly match the build reported by the NAS.'
    fi
  elif [ "$phase" != repository ]; then
    fail 'QNAP OS version could not be read from uLinux.conf.'
  fi
  if [ -n "$detected_cs_version" ]; then
    pass "QNAP reported Container Station $detected_cs_version."
    if [ "$container_station_version" = "$detected_cs_version" ]; then
      pass 'Container Station version exactly matches the recorded target.'
    else
      fail 'Recorded Container Station version does not exactly match the version reported by QNAP.'
    fi
  elif [ "$phase" = repository ]; then
    warn 'Container Station package version could not be read from qpkg.conf; verify the exact build in App Center.'
  else
    fail 'Container Station version could not be read from qpkg.conf; staged/running checks require the installed package identity.'
  fi
elif [ "$phase" = repository ]; then
  warn 'QNAP getcfg is unavailable; model/firmware/package metadata is declaration-only on this host.'
else
  fail 'QNAP getcfg is unavailable; staged/running phases must run locally on the target QNAP.'
fi

qnap_platform=$(env_value SAFESOUND_QNAP_PLATFORM)
case "$qnap_platform" in
  linux/amd64|linux/arm64) ;;
  *) fail 'SAFESOUND_QNAP_PLATFORM must be linux/amd64 or linux/arm64.' ;;
esac

host_machine=$(uname -m 2>/dev/null || printf unknown)
case "$host_machine" in
  x86_64|amd64) host_platform='linux/amd64' ;;
  aarch64|arm64) host_platform='linux/arm64' ;;
  *)
    host_platform=''
    if [ "$phase" = repository ]; then
      warn "Repository checks are running on non-target architecture $host_machine."
    else
      fail "Unsupported NAS architecture: $host_machine. The app image is not prepared for 32-bit ARM or other architectures."
    fi
    ;;
esac

if [ -n "$host_platform" ] && [ "$qnap_platform" = "$host_platform" ]; then
  pass "NAS architecture $host_machine matches $qnap_platform."
elif [ -n "$host_platform" ]; then
  if [ "$phase" = repository ]; then
    warn "Repository host $host_platform does not match declared target $qnap_platform; target architecture is NOT_RUN."
  else
    fail "SAFESOUND_QNAP_PLATFORM=$qnap_platform does not match uname -m=$host_machine ($host_platform)."
  fi
fi

if command -v getconf >/dev/null 2>&1; then
  long_bit=$(getconf LONG_BIT 2>/dev/null || true)
  if [ "$long_bit" = 64 ]; then
    pass 'The NAS userland is 64-bit.'
  elif [ -n "$long_bit" ]; then
    if [ "$phase" = repository ]; then
      warn "Repository host is $long_bit-bit; target userland remains NOT_RUN."
    else
      fail "A 64-bit NAS userland is required; getconf reported $long_bit-bit."
    fi
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  fail 'Docker CLI is unavailable; install/start a compatible Container Station package.'
  docker_ready=false
else
  docker_ready=true
  pass 'Docker CLI is available.'
fi

compose_ready=false
if [ "$docker_ready" = true ]; then
  if docker compose version >/dev/null 2>&1; then
    compose_version=$(docker compose version --short 2>/dev/null || docker compose version 2>/dev/null)
    compose_triplet=$(printf '%s' "$compose_version" | sed -n 's/^[^0-9]*\([0-9][0-9]*\)\.\([0-9][0-9]*\)\.\([0-9][0-9]*\).*/\1 \2 \3/p')
    if [ -n "$compose_triplet" ]; then
      set -- $compose_triplet
      if [ "$1" -gt 2 ] || { [ "$1" -eq 2 ] && { [ "$2" -gt 24 ] || { [ "$2" -eq 24 ] && [ "$3" -ge 4 ]; }; }; }; then
        compose_ready=true
        pass "Docker Compose supports the required !reset merge tag ($compose_version; minimum 2.24.4)."
      else
        fail "Docker Compose 2.24.4+ is required to remove build directives safely; found $compose_version."
      fi
    else
      fail "Could not parse Docker Compose version; found $compose_version."
    fi
  elif command -v docker-compose >/dev/null 2>&1; then
    fail 'Only legacy docker-compose was found; this profile targets Container Station 3 with Docker Compose V2.'
  else
    fail 'Docker Compose V2 is unavailable.'
  fi
fi

declared_docker_server_version=$(env_value SAFESOUND_DOCKER_ENGINE_VERSION)
declared_docker_api_version=$(env_value SAFESOUND_DOCKER_API_VERSION)
declared_docker_server_major=$(printf '%s' "$declared_docker_server_version" | sed -n 's/^[^0-9]*\([0-9][0-9]*\).*/\1/p')
if printf '%s' "$declared_docker_server_version" | grep -Eq '^[0-9]+\.[0-9]+(\.[0-9]+)?([+~._-][A-Za-z0-9+~._-]+)?$' && \
   [ -n "$declared_docker_server_major" ] && [ "$declared_docker_server_major" -ge 28 ]; then
  pass "Declared Docker Engine meets the 28+ baseline ($declared_docker_server_version)."
else
  fail 'SAFESOUND_DOCKER_ENGINE_VERSION must record an exact Docker Engine 28+ server version.'
fi
if printf '%s' "$declared_docker_api_version" | grep -Eq '^[0-9]+\.[0-9]+$'; then
  pass "Declared Docker API version is recorded ($declared_docker_api_version)."
else
  fail 'SAFESOUND_DOCKER_API_VERSION must be an exact numeric API version such as 1.51.'
fi

docker_server_ready=false
docker_root=''
if [ "$phase" = repository ]; then
  not_run 'Target Docker daemon, engine patch level, volumes, images, listeners, and resources are checked only in staged/running phases.'
elif [ "$docker_ready" = true ]; then
  docker_context_local=false
  if [ "$docker_endpoint_environment_clean" != true ]; then
    fail 'Docker daemon checks are blocked because an exported Docker endpoint/API override was detected.'
  else
    docker_context=$(docker context show 2>/dev/null || true)
    docker_endpoint=''
    if [ -n "$docker_context" ]; then
      docker_endpoint=$(docker context inspect "$docker_context" --format '{{(index .Endpoints "docker").Host}}' 2>/dev/null || true)
    fi
    case "$docker_endpoint" in
      unix:///*)
        docker_context_local=true
        pass "Docker context $docker_context uses a local Unix socket."
        ;;
      '')
        fail 'Docker endpoint could not be resolved; staged/running checks require a verified local Unix socket.'
        ;;
      *)
        fail "Docker context $docker_context targets non-local endpoint $docker_endpoint; refusing mixed-host checks."
        ;;
    esac
  fi

  if [ "$docker_context_local" = true ]; then
    docker_server_version=$(docker info --format '{{.ServerVersion}}' 2>/dev/null || true)
    docker_api_version=$(docker version --format '{{.Server.APIVersion}}' 2>/dev/null || true)
    docker_os=$(docker info --format '{{.OSType}}' 2>/dev/null || true)
    docker_arch=$(docker info --format '{{.Architecture}}' 2>/dev/null || true)
    docker_root=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)
    if [ -z "$docker_server_version" ]; then
      fail 'Docker Engine is not reachable; Container Station may be stopped or the account may lack access.'
    else
      docker_server_ready=true
      pass "Docker Engine $docker_server_version / API ${docker_api_version:-unknown} is reachable ($docker_os/$docker_arch)."
      if [ "$docker_server_version" = "$declared_docker_server_version" ]; then
        pass 'Docker Engine server version exactly matches the recorded target.'
      else
        fail 'Docker Engine server version does not exactly match SAFESOUND_DOCKER_ENGINE_VERSION.'
      fi
      if [ -n "$docker_api_version" ] && [ "$docker_api_version" = "$declared_docker_api_version" ]; then
        pass 'Docker API version exactly matches the recorded target.'
      else
        fail 'Docker API version does not exactly match SAFESOUND_DOCKER_API_VERSION.'
      fi
      docker_server_major=$(printf '%s' "$docker_server_version" | sed -n 's/^[^0-9]*\([0-9][0-9]*\).*/\1/p')
      if [ -n "$docker_server_major" ] && [ "$docker_server_major" -ge 28 ]; then
        pass 'Docker Engine is new enough for loopback-publish isolation (28+ baseline).'
      else
        fail "Docker Engine 28+ is required because older engines may expose 127.0.0.1-published ports to same-L2 hosts; found $docker_server_version."
      fi
      if [ "$docker_os" != linux ]; then
        fail "QNAP requires a Linux Docker Engine; Docker reported $docker_os."
      fi
      case "$docker_arch" in
        x86_64|amd64) docker_platform='linux/amd64' ;;
        aarch64|arm64) docker_platform='linux/arm64' ;;
        *) docker_platform='' ;;
      esac
      if [ -z "$docker_platform" ]; then
        fail "Docker reported unsupported architecture $docker_arch."
      elif [ "$docker_platform" != "$qnap_platform" ]; then
        fail "Docker architecture $docker_arch does not match $qnap_platform."
      else
        pass 'Docker server architecture matches the declared target platform.'
      fi
    fi
  fi
fi

min_free_gb=$(env_value SAFESOUND_QNAP_MIN_FREE_GB)
if ! printf '%s' "$min_free_gb" | grep -Eq '^[1-9][0-9]*$'; then
  fail 'SAFESOUND_QNAP_MIN_FREE_GB must be a positive whole number without leading zeroes.'
else
    if [ "$phase" = repository ]; then
      not_run 'Target Docker-root capacity is checked in staged/running phases.'
    elif [ -n "$docker_root" ] && command -v df >/dev/null 2>&1; then
      free_kb=$(df -Pk "$docker_root" 2>/dev/null | awk 'NR > 1 { available = $4 } END { print available }')
      case "$free_kb" in
        ''|*[!0-9]*) warn "Could not read free space for Docker root $docker_root." ;;
        *)
          free_gb=$((free_kb / 1048576))
          if [ "$free_gb" -ge "$min_free_gb" ]; then
            pass "Docker storage has approximately ${free_gb} GiB free (minimum ${min_free_gb} GiB)."
          else
            fail "Docker storage has approximately ${free_gb} GiB free; ${min_free_gb} GiB is required by the declared floor."
          fi
          ;;
      esac
    else
      fail 'Docker storage capacity could not be checked on the staged/running target.'
    fi
fi

min_total_ram_mb=$(env_value SAFESOUND_QNAP_MIN_TOTAL_RAM_MB)
min_available_ram_mb=$(env_value SAFESOUND_QNAP_MIN_AVAILABLE_RAM_MB)
if ! printf '%s' "$min_total_ram_mb" | grep -Eq '^[1-9][0-9]*$'; then
  fail 'SAFESOUND_QNAP_MIN_TOTAL_RAM_MB must be a positive whole number without leading zeroes.'
  min_total_ram_mb=999999
fi
if ! printf '%s' "$min_available_ram_mb" | grep -Eq '^[1-9][0-9]*$'; then
  fail 'SAFESOUND_QNAP_MIN_AVAILABLE_RAM_MB must be a positive whole number without leading zeroes.'
  min_available_ram_mb=999999
fi

detected_total_ram_mb=''
if [ "$phase" = repository ]; then
  not_run 'Target total and available RAM are checked in staged/running phases.'
elif [ -r /proc/meminfo ]; then
  total_ram_kb=$(awk '$1 == "MemTotal:" { print $2; exit }' /proc/meminfo)
  available_ram_kb=$(awk '$1 == "MemAvailable:" { print $2; exit }' /proc/meminfo)
  case "$total_ram_kb" in
    ''|*[!0-9]*) fail 'Could not read MemTotal from /proc/meminfo.' ;;
    *)
      detected_total_ram_mb=$((total_ram_kb / 1024))
      if [ "$detected_total_ram_mb" -ge "$min_total_ram_mb" ]; then
        pass "Target has approximately ${detected_total_ram_mb} MiB RAM (minimum ${min_total_ram_mb} MiB)."
      else
        fail "Target has approximately ${detected_total_ram_mb} MiB RAM; minimum is ${min_total_ram_mb} MiB."
      fi
      ;;
  esac
  case "$available_ram_kb" in
    ''|*[!0-9]*) fail 'Could not read MemAvailable from /proc/meminfo.' ;;
    *)
      available_ram_mb=$((available_ram_kb / 1024))
      if [ "$available_ram_mb" -ge "$min_available_ram_mb" ]; then
        pass "Target has approximately ${available_ram_mb} MiB available RAM (minimum ${min_available_ram_mb} MiB)."
      else
        fail "Target has approximately ${available_ram_mb} MiB available RAM; minimum is ${min_available_ram_mb} MiB before staging."
      fi
      ;;
  esac
else
  fail 'Target RAM could not be read from /proc/meminfo.'
fi

project_name=$(env_value COMPOSE_PROJECT_NAME)
if recorded_value_is_valid COMPOSE_PROJECT_NAME && printf '%s' "$project_name" | grep -Eq '^[a-z0-9][a-z0-9_-]*$'; then
  pass "Compose project name is stable and valid ($project_name)."
elif ! recorded_value_is_valid COMPOSE_PROJECT_NAME; then
  not_run 'Compose project-name validation is blocked by a missing/placeholder value.'
else
  fail 'COMPOSE_PROJECT_NAME must use lowercase letters, digits, underscores, or hyphens.'
fi

release_id=$(env_value SAFESOUND_QNAP_RELEASE_ID)
release_id_valid=false
if recorded_value_is_valid SAFESOUND_QNAP_RELEASE_ID && printf '%s' "$release_id" | grep -Eq '^[A-Fa-f0-9]{7,40}$'; then
  release_id_valid=true
  pass "Release identifier has a valid immutable-tag shape ($release_id)."
elif ! recorded_value_is_valid SAFESOUND_QNAP_RELEASE_ID; then
  not_run 'Release-identifier validation is blocked by a missing/placeholder value.'
else
  fail 'SAFESOUND_QNAP_RELEASE_ID must be a 7-40 character hexadecimal Git SHA prefix.'
fi

git_sha=''
if command -v git >/dev/null 2>&1 && git -C "$project_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_sha=$(git -C "$project_root" rev-parse HEAD 2>/dev/null || true)
  if [ -n "$git_sha" ] && [ "$release_id_valid" = true ]; then
    case "$git_sha" in
      "$release_id"*) pass "Release identifier matches Git revision $git_sha." ;;
      *) fail "Release identifier $release_id does not prefix the current Git revision $git_sha." ;;
    esac
  elif [ -n "$git_sha" ]; then
    not_run 'Git revision matching is blocked by an invalid release identifier.'
  fi
  if [ -n "$(git -C "$project_root" status --porcelain --untracked-files=all 2>/dev/null)" ]; then
    fail 'The source tree has tracked or untracked changes; rollback identity and build inputs would be ambiguous.'
  else
    pass 'The source tree is clean.'
  fi
else
  if [ "$phase" = repository ]; then
    warn 'Git metadata is unavailable; repository provenance is not verified.'
  else
    fail 'Git metadata is unavailable; staged/running phases require a clean checkout matching the release identifier.'
  fi
fi

admin_token=$(env_value ADMIN_TOKEN)
if ! printf '%s' "$admin_token" | grep -Eq '^[0-9a-fA-F]{64,128}$'; then
  fail 'ADMIN_TOKEN must be a 64-128 character hexadecimal literal (for example: openssl rand -hex 32).'
elif is_placeholder "$admin_token"; then
  fail 'ADMIN_TOKEN still contains a placeholder.'
else
  pass 'ADMIN_TOKEN is a dotenv-safe 64-128 character hexadecimal secret (value not displayed).'
fi

if [ "$(env_value NODE_ENV)" = production ] && [ "$(env_value AI_CONTROL_ROOM_ENV)" = production ]; then
  pass 'Node and AI Control Room environments are production.'
else
  fail 'NODE_ENV and AI_CONTROL_ROOM_ENV must both be production for the QNAP profile.'
fi

allowed_origins=$(env_value ALLOWED_ORIGINS)
if printf '%s' "$allowed_origins" | grep -Eq '(^|,)[[:space:]]*\*([[:space:]]*,|$)|0\.0\.0\.0'; then
  fail 'ALLOWED_ORIGINS must not contain a wildcard or 0.0.0.0.'
elif [ -n "$allowed_origins" ]; then
  pass 'ALLOWED_ORIGINS is explicit (value not displayed).'
fi

access_mode=$(env_value SAFESOUND_QNAP_ACCESS_MODE)
case "$access_mode" in
  local-only|ssh-tunnel)
    pass "Access mode $access_mode is compatible with loopback-only publishing."
    ;;
  reverse-proxy|lan|public)
    fail 'This repository profile is not approved for reverse-proxy, LAN, or public exposure; keep local-only or use an SSH tunnel.'
    ;;
  *)
    fail 'SAFESOUND_QNAP_ACCESS_MODE must be local-only or ssh-tunnel for this profile.'
    ;;
esac

if printf '%s' "$allowed_origins" | grep -Eq '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?(,[[:space:]]*https?://(localhost|127\.0\.0\.1)(:[0-9]+)?)*$'; then
  pass 'Every allowed browser origin is loopback-only.'
else
  fail 'Every ALLOWED_ORIGINS entry must be a localhost or 127.0.0.1 origin in this non-exposed profile.'
fi

socket_url=$(env_value NEXT_PUBLIC_SOCKET_URL)
case "$socket_url" in
  http://localhost:4000|http://127.0.0.1:4000)
    pass 'NEXT_PUBLIC_SOCKET_URL matches the loopback/tunnel profile.'
    ;;
  *)
    fail 'NEXT_PUBLIC_SOCKET_URL must remain http://localhost:4000 or http://127.0.0.1:4000 in this non-exposed profile.'
    ;;
esac

global_ai=$(env_value GLOBAL_AI_ENABLED)
brain_enrich=$(env_value MSHIX_BRAIN_AUTO_ENRICH)
ollama_url=$(env_value OLLAMA_BASE_URL)
case "$global_ai" in true|false) ;; *) fail 'GLOBAL_AI_ENABLED must be true or false.' ;; esac
case "$brain_enrich" in true|false) ;; *) fail 'MSHIX_BRAIN_AUTO_ENRICH must be true or false.' ;; esac
if [ "$global_ai" = false ] && [ "$brain_enrich" = false ]; then
  pass 'AI and Brain enrichment are disabled for the baseline.'
else
  fail 'AI/enrichment is outside the resource and egress contract of this QNAP profile; both flags must be false.'
fi

case "$ollama_url" in
  http://127.0.0.1:11434|http://localhost:11434)
    pass 'Ollama fallback is confined to the API container loopback and cannot reach a LAN provider.'
    ;;
  *)
    fail 'OLLAMA_BASE_URL must remain an inert API-container loopback URL in this no-provider profile.'
    ;;
esac

for integration_key in PI_API_KEY AI_ADMIN_TOKEN AI_AGENT_TOKEN; do
  if [ -n "$(env_value "$integration_key")" ]; then
    fail "$integration_key must be empty in the QNAP no-integration baseline."
  fi
done

env_or_default() {
  requested_key=$1
  safe_default=$2
  requested_value=$(env_value "$requested_key")
  if [ -n "$requested_value" ]; then
    printf '%s' "$requested_value"
  else
    printf '%s' "$safe_default"
  fi
}

if [ "$(env_or_default AI_ADMIN_PERSISTENCE true)" = true ] && \
   [ "$(env_or_default AGENT_LEASE_MONITOR true)" = true ] && \
   [ "$(env_or_default MSHIX_ALLOW_UNAUTHENTICATED_DEV false)" = false ] && \
   [ "$(env_or_default MSHIX_BRAIN_STORE_PAYLOAD false)" = false ]; then
  pass 'Persistence/lease safeguards are enabled and unauthenticated/payload-storage overrides are disabled.'
else
  fail 'QNAP baseline requires AI_ADMIN_PERSISTENCE=true, AGENT_LEASE_MONITOR=true, MSHIX_ALLOW_UNAUTHENTICATED_DEV=false, and MSHIX_BRAIN_STORE_PAYLOAD=false.'
fi

for path_contract in \
  'AI_ADMIN_AUDIT_LOG_PATH|/app/data/ai-admin-audit-log.jsonl' \
  'AI_ADMIN_RUNTIME_STATE_PATH|/app/data/ai-admin-runtime-state.json' \
  'MSHIX_BRAIN_STORE_PATH|/app/data/mshix-brain-memory.jsonl' \
  'MSHIX_OUTBOX_PATH|/app/data/mshix-outbox.jsonl'
do
  path_key=${path_contract%%|*}
  safe_path=${path_contract#*|}
  if [ "$(env_or_default "$path_key" "$safe_path")" = "$safe_path" ]; then
    pass "$path_key remains under the reviewed /app/data volume."
  else
    fail "$path_key must be exactly $safe_path in the QNAP profile."
  fi
done


log_max_size=$(env_value SAFESOUND_QNAP_LOG_MAX_SIZE)
log_max_files=$(env_value SAFESOUND_QNAP_LOG_MAX_FILES)
if printf '%s' "$log_max_size" | grep -Eq '^([1-9]|[1-9][0-9]|100)[mM]$'; then
  pass 'Container log size rotation is bounded at 1-100 MiB per file.'
else
  fail 'SAFESOUND_QNAP_LOG_MAX_SIZE must be 1m-100m without leading zeroes.'
fi
if printf '%s' "$log_max_files" | grep -Eq '^([1-9]|10)$'; then
  pass 'Container log file count is bounded at 1-10.'
else
  fail 'SAFESOUND_QNAP_LOG_MAX_FILES must be a whole number from 1 through 10.'
fi

expect_existing=$(env_value SAFESOUND_QNAP_EXPECT_EXISTING_DATA)
case "$expect_existing" in
  true|false) ;;
  *) fail 'SAFESOUND_QNAP_EXPECT_EXISTING_DATA must be true or false.'; expect_existing=false ;;
esac
if [ "$phase" = running ] && [ "$expect_existing" != true ]; then
  fail 'running phase requires SAFESOUND_QNAP_EXPECT_EXISTING_DATA=true because the application volume must already exist.'
fi

enable_ipfs=$(env_value SAFESOUND_QNAP_ENABLE_IPFS)
case "$enable_ipfs" in
  true|false) ;;
  *) fail 'SAFESOUND_QNAP_ENABLE_IPFS must be true or false.'; enable_ipfs=false ;;
esac

feature_volume_driver=$(env_value SAFESOUND_QNAP_FEATURE_VOLUME_DRIVER)
if [ "$feature_volume_driver" != local ]; then
  fail 'SAFESOUND_QNAP_FEATURE_VOLUME_DRIVER must be local for this reviewed profile.'
fi
feature_volume_mountpoint=$(env_value SAFESOUND_QNAP_FEATURE_VOLUME_MOUNTPOINT)
if [ "$expect_existing" = true ] && [ "$phase" != repository ] && [ -z "$feature_volume_mountpoint" ]; then
  fail 'Existing data requires the exact SAFESOUND_QNAP_FEATURE_VOLUME_MOUNTPOINT recorded from docker volume inspect.'
fi

api_expected_image_id=$(env_value SAFESOUND_QNAP_API_IMAGE_ID)
frontend_expected_image_id=$(env_value SAFESOUND_QNAP_FRONTEND_IMAGE_ID)
if [ "$phase" != repository ]; then
  for expected_image_id in "$api_expected_image_id" "$frontend_expected_image_id"; do
    if ! printf '%s' "$expected_image_id" | grep -Eq '^sha256:[0-9a-f]{64}$'; then
      fail 'Staged/running image IDs must use the exact sha256:<64-lowercase-hex> form from docker image inspect.'
    fi
  done
fi

ipfs_image=$(env_value SAFESOUND_QNAP_IPFS_IMAGE)
ipfs_expected_image_id=''
if [ "$enable_ipfs" = true ]; then
  if printf '%s' "$ipfs_image" | grep -Eq '^ipfs/kubo@sha256:[0-9a-fA-F]{64}$'; then
    pass 'IPFS is opt-in and pinned by digest.'
  else
    fail 'Enabled IPFS requires SAFESOUND_QNAP_IPFS_IMAGE=ipfs/kubo@sha256:<64-hex-digest>; latest/tags are rejected.'
  fi
else
  pass 'IPFS is excluded from the baseline profile.'
fi
if [ "$enable_ipfs" = true ] && [ -n "$detected_total_ram_mb" ] && [ "$detected_total_ram_mb" -lt 3500 ]; then
  fail 'IPFS is not approved on a target with less than 3500 MiB detected RAM; TS-233 remains API+frontend only.'
fi

feature_volume=$(env_value SAFESOUND_QNAP_FEATURE_VOLUME)
ipfs_volume=$(env_value SAFESOUND_QNAP_IPFS_VOLUME)
if [ "$feature_volume" = "$ipfs_volume" ]; then
  fail 'SAFESOUND_QNAP_FEATURE_VOLUME and SAFESOUND_QNAP_IPFS_VOLUME must name different physical Docker volumes.'
else
  pass 'Application and IPFS data use distinct physical Docker volume names.'
fi

compose_qnap() {
  if [ "$enable_ipfs" = true ]; then
    docker compose \
      --env-file "$env_file" \
      --project-name "$project_name" \
      -f "$base_compose" \
      -f "$qnap_compose" \
      --profile qnap \
      --profile qnap-ipfs \
      "$@"
  else
    docker compose \
      --env-file "$env_file" \
      --project-name "$project_name" \
      -f "$base_compose" \
      -f "$qnap_compose" \
      --profile qnap \
      "$@"
  fi
}

config_ready=false
if [ "$compose_ready" = true ] && [ "$recorded_inputs_invalid" = false ] && [ "$managed_environment_clean" = true ]; then
  if compose_qnap config --quiet >/dev/null 2>&1; then
    config_ready=true
    pass 'Canonical Compose plus QNAP overlay passes Compose V2 config validation.'
  else
    fail 'Compose config validation failed. Check required values and bundled Compose feature support; do not print the resolved config because it contains secrets.'
  fi
elif [ "$compose_ready" = true ] && [ "$managed_environment_clean" != true ]; then
  not_run 'Compose rendering is skipped until exported Compose/environment overrides are removed.'
elif [ "$compose_ready" = true ]; then
  not_run 'Compose rendering is skipped until all required recorded values are non-placeholder literals.'
fi

if [ "$config_ready" = true ]; then
  rendered_config=$(compose_qnap config 2>/dev/null || true)
  active_services=$(compose_qnap config --services 2>/dev/null || true)
  for service in api-server frontend; do
    if printf '%s\n' "$active_services" | grep -qx "$service"; then
      pass "Profile activates required service $service."
    else
      fail "Profile does not activate required service $service."
    fi
  done
  if [ "$enable_ipfs" = true ]; then
    if printf '%s\n' "$active_services" | grep -qx ipfs; then
      pass 'The explicitly requested qnap-ipfs profile activates IPFS.'
    else
      fail 'IPFS was requested but is not active in the rendered profile.'
    fi
  elif printf '%s\n' "$active_services" | grep -qx ipfs; then
    fail 'IPFS is active even though SAFESOUND_QNAP_ENABLE_IPFS=false.'
  else
    pass 'The baseline qnap profile does not activate IPFS.'
  fi

  expected_service_count=2
  if [ "$enable_ipfs" = true ]; then
    expected_service_count=3
  fi
  if printf '%s\n' "$rendered_config" | grep -q '^[[:space:]]\{4\}build:'; then
    fail 'Rendered QNAP services still contain build directives; on-NAS builds are forbidden.'
  else
    pass 'The !reset overlay removes every application build directive.'
  fi
  pull_never_count=$(printf '%s\n' "$rendered_config" | grep -c '^[[:space:]]\{4\}pull_policy: never' || true)
  if [ "$pull_never_count" -eq "$expected_service_count" ]; then
    pass 'Every active service uses pull_policy=never; Compose cannot fetch registry content implicitly.'
  else
    fail "Expected pull_policy=never on $expected_service_count active services; rendered $pull_never_count."
  fi
  resource_field_count=$(printf '%s\n' "$rendered_config" | grep -Ec '^[[:space:]]{4}(cpus|mem_limit|mem_reservation|pids_limit):' || true)
  expected_resource_fields=$((expected_service_count * 4))
  if [ "$resource_field_count" -eq "$expected_resource_fields" ]; then
    pass 'Every active service has CPU, memory, reservation, and PID limits.'
  else
    fail "Expected $expected_resource_fields rendered resource-limit fields; found $resource_field_count."
  fi
  node_heap_count=$(printf '%s\n' "$rendered_config" | grep -c 'NODE_OPTIONS: --max-old-space-size=' || true)
  if [ "$node_heap_count" -eq 2 ]; then
    pass 'API and frontend have bounded Node heap settings below their container memory limits.'
  else
    fail "Expected two bounded Node heap settings; rendered $node_heap_count."
  fi

  expected_platforms=2
  if [ "$enable_ipfs" = true ]; then
    expected_platforms=3
  fi
  rendered_platforms=$(compose_qnap config 2>/dev/null | grep -Fc "platform: $qnap_platform" || true)
  if [ "$rendered_platforms" -eq "$expected_platforms" ]; then
    pass "Every active service is pinned to $qnap_platform."
  else
    fail "Expected $expected_platforms active services on $qnap_platform; rendered $rendered_platforms."
  fi
  if compose_qnap config 2>/dev/null | grep -Fq "image: safesoundarena-api:$release_id" && \
     compose_qnap config 2>/dev/null | grep -Fq "image: safesoundarena-frontend:$release_id"; then
    pass 'API and frontend image tags match the recorded release identifier.'
  else
    fail 'Rendered application image tags do not match SAFESOUND_QNAP_RELEASE_ID.'
  fi

  check_local_image() {
    image_ref=$1
    expected_id=$2
    image_label=$3
    expected_revision=$4
    expected_socket_label=$5
    local_image_id=$(docker image inspect --format '{{.Id}}' "$image_ref" 2>/dev/null || true)
    local_image_platform=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$image_ref" 2>/dev/null || true)
    local_image_revision=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_ref" 2>/dev/null || true)
    if [ -z "$local_image_id" ]; then
      fail "$image_label image $image_ref is not preloaded locally; Compose is intentionally forbidden from pulling or building it."
      return
    fi
    if [ -n "$expected_id" ] && [ "$local_image_id" != "$expected_id" ]; then
      fail "$image_label image ID does not match the recorded build/load identity."
    elif [ -n "$expected_id" ]; then
      pass "$image_label image ID matches the recorded identity ($local_image_id)."
    else
      pass "$image_label digest reference is preloaded as image $local_image_id."
    fi
    if [ "$local_image_platform" = "$qnap_platform" ]; then
      pass "$image_label image platform matches $qnap_platform."
    else
      fail "$image_label image platform is $local_image_platform, expected $qnap_platform."
    fi
    if [ -n "$expected_revision" ]; then
      if [ "$local_image_revision" = "$expected_revision" ]; then
        pass "$image_label image provenance label matches Git revision $expected_revision."
      else
        fail "$image_label image provenance label does not match the clean checkout revision."
      fi
    fi
    if [ -n "$expected_socket_label" ]; then
      local_socket_label=$(docker image inspect --format '{{index .Config.Labels "io.safesoundarena.next-public-socket-url"}}' "$image_ref" 2>/dev/null || true)
      if [ "$local_socket_label" = "$expected_socket_label" ]; then
        pass 'Frontend image label proves the reviewed NEXT_PUBLIC_SOCKET_URL build input.'
      else
        fail 'Frontend image NEXT_PUBLIC_SOCKET_URL build label differs from the checked environment file.'
      fi
    fi
  }

  if [ "$phase" = repository ]; then
    not_run 'Local application image IDs and platforms are checked after off-NAS images are staged on the QNAP.'
  elif [ "$docker_server_ready" = true ]; then
    check_local_image "safesoundarena-api:$release_id" "$api_expected_image_id" API "$git_sha" ''
    check_local_image "safesoundarena-frontend:$release_id" "$frontend_expected_image_id" frontend "$git_sha" "$socket_url"
    if [ "$enable_ipfs" = true ]; then
      check_local_image "$ipfs_image" '' IPFS '' ''
      ipfs_expected_image_id=$(docker image inspect --format '{{.Id}}' "$ipfs_image" 2>/dev/null || true)
    fi
  fi

  rendered_volumes=$(compose_qnap config --volumes 2>/dev/null || true)
  if printf '%s\n' "$rendered_volumes" | grep -qx feature_data; then
    pass 'The required feature_data volume is declared.'
  else
    fail 'The required feature_data volume is missing.'
  fi
  if [ "$enable_ipfs" = true ] && ! printf '%s\n' "$rendered_volumes" | grep -qx ipfs_data; then
    fail 'The enabled IPFS profile is missing ipfs_data.'
  fi
  if compose_qnap config 2>/dev/null | grep -Fq "name: $feature_volume"; then
    pass "feature_data resolves to stable volume $feature_volume."
  else
    fail 'feature_data does not resolve to the recorded stable volume name.'
  fi
  if [ "$enable_ipfs" = true ]; then
    if compose_qnap config 2>/dev/null | grep -Fq "name: $ipfs_volume"; then
      pass "ipfs_data resolves to stable volume $ipfs_volume."
    else
      fail 'ipfs_data does not resolve to the recorded stable volume name.'
    fi
  fi

  port_stats=$(compose_qnap config 2>/dev/null | awk '
    /^[[:space:]]+published:/ {
      published++
    }
    /^[[:space:]]+host_ip:/ {
      host_ips++
      value = $2
      gsub(/["\047]/, "", value)
      if (value != "127.0.0.1") {
        non_loopback++
      }
    }
    END {
      printf "%d %d %d", published + 0, host_ips + 0, non_loopback + 0
    }
  ')
  set -- $port_stats
  expected_ports=2
  if [ "$enable_ipfs" = true ]; then
    expected_ports=4
  fi
  if [ "$1" -eq "$expected_ports" ] && [ "$2" -eq "$expected_ports" ] && [ "$3" -eq 0 ]; then
    pass "All $expected_ports published ports have an explicit 127.0.0.1 host binding."
  else
    fail "Rendered ports are unsafe or unexpected (published=$1, explicit-host-ip=$2, non-loopback=$3, expected=$expected_ports)."
  fi

  if compose_qnap config 2>/dev/null | grep -Eq '^[[:space:]]+network_mode:[[:space:]]+["'\'']?host'; then
    fail 'Host networking is forbidden for the QNAP profile.'
  else
    pass 'Host networking is not enabled.'
  fi
  if compose_qnap config 2>/dev/null | grep -Eq '^[[:space:]]+privileged:[[:space:]]+true|/var/run/docker\.sock'; then
    fail 'Privileged mode or a Docker socket mount is forbidden.'
  else
    pass 'No privileged mode or Docker socket mount is rendered.'
  fi

  healthcheck_count=$(compose_qnap config 2>/dev/null | grep -c '^[[:space:]]\{4\}healthcheck:' || true)
  expected_healthchecks=2
  if [ "$enable_ipfs" = true ]; then
    expected_healthchecks=3
  fi
  if [ "$healthcheck_count" -eq "$expected_healthchecks" ] && \
     compose_qnap config 2>/dev/null | grep -q 'condition: service_healthy' && \
     compose_qnap config 2>/dev/null | grep -q 'start_period: 45s'; then
    pass 'Rendered services include health checks, startup tolerance, and API-dependent frontend ordering.'
  else
    fail 'Rendered health-check contract is incomplete or unsupported by this Compose build.'
  fi
  if grep -q 'grep -Eq.*status' "$qnap_compose"; then
    pass 'The QNAP API health check requires JSON status=ok, not HTTP 200 alone.'
  else
    fail 'The QNAP API health check does not enforce semantic JSON status.'
  fi
  if [ -f "$frontend_config" ] && grep -q 'connect-src' "$frontend_config" && \
     ! grep -Eq "Access-Control-Allow-Origin.*['\"]\*['\"]" "$frontend_config"; then
    pass 'Frontend CSP includes an explicit socket connect-src and emits no wildcard CORS response header.'
  else
    fail 'Frontend socket CSP or response-origin policy is not safe for the reviewed loopback build.'
  fi

  warn 'The bridge network still permits outbound traffic; provider, DNS, LAN/VPN CIDR, and QNAP firewall review remain manual gates.'
fi

for volume_name in "$feature_volume" "$ipfs_volume"; do
  if ! printf '%s' "$volume_name" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9_.-]*$'; then
    fail "Invalid Docker volume name: $volume_name."
  fi
done

check_volume() {
  volume_name=$1
  required_now=$2
  expected_mountpoint=$3
  if [ "$docker_server_ready" != true ]; then
    return
  fi
  if docker volume inspect "$volume_name" >/dev/null 2>&1; then
    volume_driver=$(docker volume inspect --format '{{.Driver}}' "$volume_name" 2>/dev/null || printf unknown)
    volume_mountpoint=$(docker volume inspect --format '{{.Mountpoint}}' "$volume_name" 2>/dev/null || true)
    volume_project=$(docker volume inspect --format '{{index .Labels "com.docker.compose.project"}}' "$volume_name" 2>/dev/null || true)
    if [ -n "$volume_project" ] && [ "$volume_project" != '<no value>' ] && [ "$volume_project" != "$project_name" ]; then
      fail "Volume $volume_name is labeled for Compose project $volume_project, not $project_name."
    elif [ -z "$volume_project" ] || [ "$volume_project" = '<no value>' ]; then
      if [ "$required_now" = true ] && [ "$expect_existing" = true ]; then
        fail "Required existing volume $volume_name has no Compose project label; ownership is not proven."
      else
        warn "Optional volume $volume_name has no Compose project label; ownership requires manual confirmation."
      fi
    else
      pass "Volume $volume_name is labeled for project $project_name."
    fi
    if [ "$volume_driver" = "$feature_volume_driver" ]; then
      pass "Volume $volume_name uses the recorded driver $volume_driver."
    else
      fail "Volume $volume_name uses driver $volume_driver, expected $feature_volume_driver."
    fi
    if [ -n "$expected_mountpoint" ]; then
      if [ "$volume_mountpoint" = "$expected_mountpoint" ]; then
        pass "Volume $volume_name mountpoint matches the recorded storage identity."
      else
        fail "Volume $volume_name mountpoint does not match SAFESOUND_QNAP_FEATURE_VOLUME_MOUNTPOINT."
      fi
    fi
    if [ "$expect_existing" = true ] || [ "$required_now" = false ]; then
      pass "Existing volume $volume_name is present (driver $volume_driver)."
    else
      fail "Volume $volume_name already exists although a fresh target was declared; stop and resolve ownership."
    fi
  elif [ "$expect_existing" = true ] && [ "$required_now" = true ]; then
    fail "Expected existing volume $volume_name is missing. Stop; do not create a replacement with the same name."
  elif [ "$required_now" = true ]; then
    pass "Volume $volume_name is absent on the declared fresh target; a future authorized deployment may create it."
  else
    pass "Optional volume $volume_name is absent."
  fi
}

check_volume "$feature_volume" true "$feature_volume_mountpoint"
if [ "$enable_ipfs" = true ]; then
  check_volume "$ipfs_volume" true ''
else
  check_volume "$ipfs_volume" false ''
fi

listener_data=''
if [ "$phase" = repository ]; then
  not_run 'Target listener and port-conflict checks run only in staged/running phases.'
elif command -v ss >/dev/null 2>&1; then
  listener_data=$(ss -ltn 2>/dev/null || true)
elif command -v netstat >/dev/null 2>&1; then
  listener_data=$(netstat -lnt 2>/dev/null || true)
else
  warn 'Neither ss nor netstat is available; host port conflicts were not checked.'
fi

if [ "$phase" != repository ] && [ -z "$listener_data" ] && { command -v ss >/dev/null 2>&1 || command -v netstat >/dev/null 2>&1; }; then
  warn 'The listener tool returned no usable data; host port conflicts were not checked.'
fi

port_is_listening() {
  printf '%s\n' "$listener_data" | awk -v port="$1" '
    {
      address = $4
      if (address ~ (":" port "$")) {
        found = 1
      }
    }
    END {
      exit(found ? 0 : 1)
    }
  '
}

if [ -n "$listener_data" ]; then
  for port in 3000 4000; do
    if port_is_listening "$port"; then
      if [ "$phase" = running ]; then
        warn "Port $port is already listening; semantic health will determine whether the expected app owns it."
      else
        fail "Port $port is already in use during staged preflight; no running-app ownership is accepted in this phase."
      fi
    elif [ "$phase" = running ]; then
      fail "Expected running application port $port is not listening."
    else
      pass "Required loopback port $port is currently free."
    fi
  done
  for port in 5001 8080; do
    if port_is_listening "$port"; then
      if [ "$enable_ipfs" = true ]; then
        if [ "$phase" = running ]; then
          warn "IPFS port $port is already listening; verify ownership before any recreate."
        else
          fail "IPFS port $port is already in use; 8080 commonly conflicts with QNAP administration."
        fi
      else
        pass "Port $port is occupied but IPFS is excluded, so the baseline profile will not publish it."
      fi
    elif [ "$enable_ipfs" = true ] && [ "$phase" = running ]; then
      fail "Expected running IPFS port $port is not listening."
    elif [ "$enable_ipfs" = true ]; then
      pass "Requested IPFS port $port is currently free."
    fi
  done
fi

verify_running_container() {
  service_name=$1
  expected_image_id=$2
  shift 2
  expected_port_count=$#
  container_id=$(compose_qnap ps -q "$service_name" 2>/dev/null || true)
  if [ -z "$container_id" ]; then
    fail "Expected running Compose service $service_name was not found for project $project_name."
    return
  fi
  container_project=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container_id" 2>/dev/null || true)
  container_service=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$container_id" 2>/dev/null || true)
  container_config_hash=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "$container_id" 2>/dev/null || true)
  expected_config_hash=$(compose_qnap config --hash "$service_name" 2>/dev/null | awk -v service="$service_name" '$1 == service { print $2; exit }')
  container_image_id=$(docker inspect --format '{{.Image}}' "$container_id" 2>/dev/null || true)
  container_state=$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)
  container_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)
  container_ports=$(docker inspect --format '{{json .NetworkSettings.Ports}}' "$container_id" 2>/dev/null || true)
  if [ "$container_project" = "$project_name" ] && [ "$container_service" = "$service_name" ]; then
    pass "Running $service_name container belongs to the expected Compose project/service."
  else
    fail "Running $service_name container labels do not match project $project_name."
  fi
  if [ -n "$expected_config_hash" ] && [ "$container_config_hash" = "$expected_config_hash" ]; then
    pass "Running $service_name container matches the complete rendered Compose config hash."
  else
    fail "Running $service_name container is stale or differs from the rendered resource/env/mount/log/restart contract."
  fi
  if [ "$container_image_id" = "$expected_image_id" ]; then
    pass "Running $service_name container uses the recorded image ID."
  else
    fail "Running $service_name container image ID differs from the staged identity."
  fi
  if [ "$container_state" = running ] && [ "$container_health" = healthy ]; then
    pass "Running $service_name container reports Docker health=healthy."
  else
    fail "Service $service_name state/health is $container_state/$container_health."
  fi
  host_binding_count=$(printf '%s' "$container_ports" | grep -o '"HostIp":' | wc -l | tr -d ' ')
  port_bindings_match=true
  for expected_port in "$@"; do
    if ! printf '%s' "$container_ports" | grep -Fq "\"$expected_port/tcp\":[{\"HostIp\":\"127.0.0.1\",\"HostPort\":\"$expected_port\"}]"; then
      port_bindings_match=false
    fi
  done
  if [ "$port_bindings_match" = true ] && [ "$host_binding_count" -eq "$expected_port_count" ]; then
    pass "Running $service_name publishes only its $expected_port_count expected host IPv4 loopback port binding(s)."
  else
    fail "Running $service_name port bindings do not exactly match the reviewed IPv4 loopback contract."
  fi
}

if [ "$phase" = running ]; then
  if [ "$docker_server_ready" = true ] && [ "$config_ready" = true ]; then
    verify_running_container api-server "$api_expected_image_id" 4000
    verify_running_container frontend "$frontend_expected_image_id" 3000
    if [ "$enable_ipfs" = true ]; then
      verify_running_container ipfs "$ipfs_expected_image_id" 5001 8080
    fi
  else
    fail 'Running container checks require a verified local Docker daemon and valid rendered Compose configuration.'
  fi
  if [ "$docker_server_ready" = true ] && command -v curl >/dev/null 2>&1 && port_is_listening 3000 && port_is_listening 4000; then
    api_body=$(curl -fsS --max-time 10 http://127.0.0.1:4000/api/health 2>/dev/null || true)
    proxy_body=$(curl -fsS --max-time 10 http://127.0.0.1:3000/api/health 2>/dev/null || true)
    if printf '%s' "$api_body" | grep -Eq '^[[:space:]]*\{[[:space:]]*"status"[[:space:]]*:[[:space:]]*"ok"[[:space:]]*,'; then
      pass 'Existing API semantic health is ok.'
    else
      fail 'Existing API health is unavailable or reports a non-ok JSON status.'
    fi
    if curl -fsS --max-time 10 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
      pass 'Existing frontend root is reachable on loopback.'
    else
      fail 'Existing frontend root is not healthy on loopback.'
    fi
    if printf '%s' "$proxy_body" | grep -Eq '^[[:space:]]*\{[[:space:]]*"status"[[:space:]]*:[[:space:]]*"ok"[[:space:]]*,'; then
      pass 'Existing frontend-to-API proxy health is ok.'
    else
      fail 'Existing frontend-to-API proxy health is unavailable or degraded.'
    fi
  else
    fail 'Existing-target runtime health could not run because both loopback services are not listening or curl is unavailable.'
  fi
else
  not_run 'Container identity and runtime health run only in the explicitly selected running phase.'
fi

warn 'feature_data covers /app/data only; MCP permission mutations live in the container layer and Jail/user state is in memory.'
warn 'Named volumes are not backups. A stopped, verified backup and restore exercise remain required before deployment or rollback.'

printf '\nSummary: %d pass, %d warning(s), %d not-run gate(s), %d error(s).\n' "$passes" "$warnings" "$not_run_count" "$errors"
if [ "$errors" -gt 0 ]; then
  printf '%s\n' 'QNAP PREFLIGHT FAILED. No deployment action was taken.'
  exit 1
fi

if [ "$not_run_count" -gt 0 ]; then
  printf '%s\n' 'QNAP STATIC PREFLIGHT PASSED WITH RUNTIME GATES NOT RUN. This is not deployment or acceptance authorization.'
else
  printf '%s\n' 'QNAP PREFLIGHT PASSED. This is compatibility evidence, not deployment authorization.'
fi
exit 0
