# Dockerfile for SafeSoundArena Frontend (Next.js)

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Check for updates first
RUN apk update && apk upgrade

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies with cache
RUN npm install --legacy-peer-deps --prefer-offline --no-audit

# Copy remaining files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security hardening
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Read-only filesystem except for temp
RUN mkdir -p /tmp && chown appuser:appgroup /tmp

USER appuser
VOLUME /tmp

COPY --from=builder --chown=appuser:appgroup /app .

# Security flags
EXPOSE 3000


# Runtime security and JAILTIME isolation
RUN echo "appuser hard nproc 100" >> /etc/security/limits.conf
RUN echo "kernel.yama.ptrace_scope = 2" >> /etc/sysctl.conf
RUN echo "kernel.unprivileged_userns_clone=0" >> /etc/sysctl.conf
RUN echo "kernel.kptr_restrict=2" >> /etc/sysctl.conf

# Enhanced security flags
ENV JAILTIME_READ_ONLY_FS=true
ENV JAILTIME_NO_NEW_PRIVILEGES=true

# Advanced seccomp profile
COPY --chown=appuser:appgroup seccomp.json /seccomp.json
RUN chmod 640 /seccomp.json && chown appuser:appgroup /seccomp.json
ENV JAILTIME_SECCOMP_PROFILE=/seccomp.json

# Strict process isolation
ENV JAILTIME_NO_NETWORK_NAMESPACE=true
ENV JAILTIME_NO_IPC_NAMESPACE=true
ENV JAILTIME_NO_UTS_NAMESPACE=true

# Enhanced resource monitoring
ENV JAILTIME_METRICS_INTERVAL=30s
ENV JAILTIME_METRICS_ENDPOINT=/metrics

# Additional security hardening
RUN echo "kernel.randomize_va_space=2" >> /etc/sysctl.conf
RUN echo "net.ipv4.conf.all.accept_redirects=0" >> /etc/sysctl.conf
RUN echo "net.ipv4.conf.default.accept_redirects=0" >> /etc/sysctl.conf

# Additional security restrictions
RUN echo "kernel.dmesg_restrict=1" >> /etc/sysctl.conf
RUN echo "kernel.perf_event_paranoid=3" >> /etc/sysctl.conf
RUN echo "kernel.core_pattern=|/bin/false" >> /etc/sysctl.conf

# Additional security hardening
RUN echo "fs.protected_hardlinks = 1" >> /etc/sysctl.conf
RUN echo "fs.protected_symlinks = 1" >> /etc/sysctl.conf

# Strict resource isolation
RUN echo "vm.overcommit_memory=2" >> /etc/sysctl.conf
RUN echo "vm.swappiness=10" >> /etc/sysctl.conf

# Network security hardening
RUN echo "net.ipv4.tcp_syncookies=1" >> /etc/sysctl.conf
RUN echo "net.ipv4.conf.all.rp_filter=1" >> /etc/sysctl.conf
RUN echo "net.ipv4.conf.default.rp_filter=1" >> /etc/sysctl.conf

# JAILTIME isolation settings
RUN mkdir -p /jail && chown appuser:appgroup /jail
VOLUME /jail

# Cgroups and namespaces configuration
ENV JAILTIME_ISOLATION=true
ENV JAILTIME_CGROUP_MEMORY=512m
ENV JAILTIME_CGROUP_CPU=0.5

# Load balancing and auto-scaling support
ENV CLUSTER_MODE=true
ENV INSTANCE_ID=default


# Performance monitoring and JAILTIME metrics
RUN npm install -g pm2 jailtime-monitor --legacy-peer-deps

# Dynamic resource allocation and reward system
ENV REWARD_SYSTEM_ENABLED=true
ENV MIN_RESOURCE_ALLOCATION=0.1
ENV MAX_RESOURCE_ALLOCATION=1.0
ENV REWARD_RATE=0.05

# User consumption monitoring
RUN npm install -g consumption-tracker --legacy-peer-deps
VOLUME /var/log/consumption

# Dynamic reward calculation endpoint


# Advanced cgroups configuration
ENV JAILTIME_CGROUP_MEMORY_HARD_LIMIT=768m
ENV JAILTIME_CGROUP_CPU_QUOTA=75000
ENV JAILTIME_CGROUP_IO_WEIGHT=500

# Enhanced monitoring
RUN npm install -g jailtime-monitor@latest --legacy-peer-deps
RUN mkdir -p /var/log/jailtime && chown appuser:appgroup /var/log/jailtime
VOLUME /var/log/jailtime

# Additional process isolation
ENV JAILTIME_NO_NEW_PRIVILEGES=true
ENV JAILTIME_READ_ONLY_FS=true
ENV JAILTIME_SECCOMP_STRICT=true

# JAILTIME monitoring endpoint with metrics collection


# Process isolation with pm2 in cluster mode
# Single health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Single command to start the application with enhanced security
CMD ["pm2-runtime", "start", "npm", "--", "start", "-i", "max", "--no-daemon", "--read-only", "--no-new-privileges"]

# Docker run flags recommendation
# --read-only --tmpfs /tmp --security-opt=no-new-privileges
COPY --chown=appuser:appgroup seccomp.json /seccomp.json
RUN chmod 640 /seccomp.json && chown appuser:appgroup /seccomp.json
ENV JAILTIME_SECCOMP_PROFILE=/seccomp.json
RUN npm install --legacy-peer-deps --prefer-offline --no-audit
