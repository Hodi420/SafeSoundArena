#!/bin/bash

# Deployment script for SafeSoundArena Authentication Service
set -e

echo "🚀 Starting deployment of SafeSoundArena Authentication Service..."

# Load environment variables
if [ -f "../.env" ]; then
    echo "🔧 Loading environment variables..."
    export $(grep -v '^#' ../.env | xargs)
else
    echo "❌ Error: .env file not found in the project root"
    exit 1
fi

# Check for required environment variables
required_vars=(
    "JWT_SECRET"
    "REFRESH_TOKEN_SECRET"
    "MONGO_INITDB_ROOT_USERNAME"
    "MONGO_INITDB_ROOT_PASSWORD"
    "GRAFANA_ADMIN_USER"
    "GRAFANA_ADMIN_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file"
        exit 1
    fi
done

# Create necessary directories
echo "📂 Creating necessary directories..."
mkdir -p ../logs

# Build and start services
echo "🚀 Starting services with Docker Compose..."
docker-compose -f docker-compose.auth.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
services=("mongodb" "redis" "auth-service" "prometheus" "grafana")

for service in "${services[@]}"; do
    echo "⌛ Waiting for $service to be ready..."
    until docker ps --filter "name=$service" --format '{{.Status}}' | grep -q "healthy\|up"; do
        sleep 5
    done
done

echo "✅ All services are up and running!"

# Display service information
echo "\n🌐 Service Endpoints:"
echo "- Authentication API: http://localhost:3002"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3000"
echo "  - Username: $GRAFANA_ADMIN_USER"
echo "  - Password: $GRAFANA_ADMIN_PASSWORD"

echo "\n🎉 Deployment completed successfully!"
echo "💡 You can now access the authentication service at http://localhost:3002"
echo "📊 Monitoring dashboard is available at http://localhost:3000"
