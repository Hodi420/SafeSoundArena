#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local service=$1
    local url=$2
    local name=$3
    
    echo -n "Checking $name... "
    if curl --output /dev/null --silent --head --fail "$url"; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

# Function to check container status
check_container() {
    local name=$1
    echo -n "Container $name status: "
    
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        echo -e "${GREEN}Running${NC}"
        return 0
    else
        echo -e "${RED}Not running${NC}"
        docker ps -a | grep "${name}" || echo "Container not found"
        return 1
    fi
}

# Function to check logs for errors
check_logs() {
    local name=$1
    local pattern=${2:-'error|exception|fail|warn'}
    
    echo -e "\n${YELLOW}=== Checking logs for $name (last 20 lines) ===${NC}"
    docker logs --tail=20 "$name" 2>&1 | grep -E -i "$pattern" || echo "No errors found in logs"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check containers
containers=(
    "prometheus"
    "grafana"
    "alertmanager"
    "node-exporter"
    "cadvisor"
    "loki"
    "promtail"
    "uptime-kuma"
    "portainer"
    "traefik"
)

for container in "${containers[@]}"; do
    check_container "$container"
done

# Check services
services=(
    "http://localhost:3000"
    "http://localhost:9090"
    "http://localhost:9093"
    "http://localhost:3001"
    "http://localhost:9000"
)

for service in "${services[@]}"; do
    name=$(echo "$service" | cut -d'/' -f3-)
    check_service "$service" "$service" "$name"
done

# Check Prometheus targets
echo -e "\n${YELLOW}=== Checking Prometheus Targets ===${NC}"
curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[] | .health + " | " + .scrapeUrl + " | " + .lastError'

# Check Grafana dashboards
echo -e "\n${YELLOW}=== Checking Grafana Dashboards ===${NC}"
curl -s -u admin:admin http://localhost:3000/api/search | jq -r '.[] | .title'

# Check for common issues
check_logs "prometheus"
check_logs "grafana"
check_logs "alertmanager"

echo -e "\n${GREEN}=== Validation Complete ===${NC}"
echo "To view logs for a specific container, run: docker logs -f <container_name>"
echo "To access the monitoring stack:"
echo "- Grafana: http://localhost:3000 (admin/admin)"
echo "- Prometheus: http://localhost:9090"
echo "- Alertmanager: http://localhost:9093"
echo "- Portainer: http://localhost:9000"
echo "- Uptime Kuma: http://localhost:3001"
