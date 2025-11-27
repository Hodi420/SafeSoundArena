#!/bin/bash

# Script to set up monitoring alerts for SafeSoundArena

echo "🚀 Setting up monitoring alerts..."

# Create Alertmanager configuration
cat > alertmanager/alertmanager.yml << 'EOL'
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: 'critical'
      receiver: 'slack-critical'
      repeat_interval: 30m
    - match:
        severity: 'warning'
      receiver: 'slack-warnings'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '{{ template "slack.default.title" . }}'
        text: '{{ template "slack.default.text" . }}'
        icon_emoji: '🚨'
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#critical-alerts'
        send_resolved: true
        title: 'CRITICAL: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}\n\n{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
        icon_emoji: '🔥'
        color: 'danger'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#warnings'
        send_resolved: true
        title: 'WARNING: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}\n\n{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
        icon_emoji: '⚠️'
        color: 'warning'

templates:
  - '/etc/alertmanager/templates/*.tmpl'
EOL

# Create Alertmanager templates
mkdir -p alertmanager/templates

cat > alertmanager/templates/slack.tmpl << 'EOL'
{{ define "slack.default.title" }}{{ .Status | toUpper }}{{ if eq .Status "firing" }}: {{ .Alerts.Firing | len }} alert(s) firing{{ end }}{{ end }}

{{ define "slack.default.text" }}
{{ range .Alerts }}
*Alert:* {{ .Labels.alertname }}
*Description:* {{ .Annotations.description }}
*Status:* {{ .Status | toUpper }}
*Severity:* {{ .Labels.severity | toUpper }}
*Starts at:* {{ .StartsAt.Format "2006-01-02 15:04:05 UTC" }}
{{ if .GeneratorURL }}
*Source:* <{{ .GeneratorURL }}|🔍 View in Prometheus>
{{ end }}
{{ end }}
{{ end }}
EOL

echo "✅ Alertmanager configuration created"

# Update Prometheus configuration to include Alertmanager
echo "🔧 Updating Prometheus configuration..."

cat >> monitoring/prometheus/prometheus.yml << 'EOL'
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts/*.rules'
EOL

echo "✅ Prometheus configuration updated"

echo "\n🎉 Alerting setup complete!"
echo "To start the monitoring stack with alerts, run:"
echo "docker-compose -f docker-compose.monitoring.yml up -d"
echo "\nMake sure to set the following environment variables:"
echo "- SLACK_WEBHOOK_URL: Your Slack webhook URL for alerts"
echo "- GRAFANA_ADMIN_USER: Admin username for Grafana"
echo "- GRAFANA_ADMIN_PASSWORD: Admin password for Grafana"
