#!/bin/bash
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENV="staging"
KUBE_CONTEXT=""
KUBE_NAMESPACE="safesoundarena-${ENV}"
IMAGE_TAG="latest"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      KUBE_NAMESPACE="safesoundarena-${ENV}"
      shift # past argument
      shift # past value
      ;;
    --context)
      KUBE_CONTEXT="--context=$2"
      shift # past argument
      shift # past value
      ;;
    --image-tag)
      IMAGE_TAG="$2"
      shift # past argument
      shift # past value
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}🚀 Starting deployment to ${ENV} environment...${NC}"

# Set kubectl context if provided
if [ -n "$KUBE_CONTEXT" ]; then
  echo -e "${YELLOW}Using Kubernetes context: ${KUBE_CONTEXT}${NC}"
  kubectl config use-context "${KUBE_CONTEXT#--context=}" || {
    echo -e "${RED}❌ Failed to set Kubernetes context${NC}"
    exit 1
  }
fi

# Check if namespace exists, create if not
if ! kubectl ${KUBE_CONTEXT} get namespace "${KUBE_NAMESPACE}" &> /dev/null; then
  echo -e "${YELLOW}Creating namespace ${KUBE_NAMESPACE}...${NC}"
  kubectl ${KUBE_CONTEXT} create namespace "${KUBE_NAMESPACE}" || {
    echo -e "${RED}❌ Failed to create namespace${NC}"
    exit 1
  }
fi

# Apply all Kubernetes manifests
echo -e "${YELLOW}Applying Kubernetes resources...${NC}"

# Apply base resources
kubectl ${KUBE_CONTEXT} apply -f k8s/namespace.yaml
kubectl ${KUBE_CONTEXT} apply -f k8s/resources.yaml
kubectl ${KUBE_CONTEXT} apply -f k8s/network-policies.yaml
kubectl ${KUBE_CONTEXT} apply -f k8s/pod-disruption-budgets.yaml

# Apply config maps
echo -e "${YELLOW}Applying config maps...${NC}"
for config in $(find k8s/configmaps -name "*.yaml" | sort); do
  echo "  - ${config}"
  envsubst < "${config}" | kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" apply -f -
done

# Apply secrets (if they exist)
if [ -d "k8s/secrets" ]; then
  echo -e "${YELLOW}Applying secrets...${NC}"
  for secret in $(find k8s/secrets -name "*.yaml" | sort); do
    echo "  - ${secret}"
    if [ -f "${secret}" ]; then
      envsubst < "${secret}" | kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" apply -f -
    fi
  done
fi

# Apply deployments
echo -e "${YELLOW}Applying deployments...${NC}"
for deployment in $(find k8s/deployments -name "*.yaml" | sort); do
  echo "  - ${deployment}"
  # Replace placeholders
  if [ "${ENV}" = "prod" ]; then
    # For production, use the blue-green deployment strategy
    CURRENT_COLOR=$(kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" get svc/safesoundarena-prod -o jsonpath='{.spec.selector.app\.kubernetes\.io/color}' 2>/dev/null || echo "blue")
    NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")
    
    echo -e "  Current color: ${CURRENT_COLOR}, Deploying to: ${NEW_COLOR}"
    
    # Deploy new version
    cat "${deployment}" | \
      sed "s/{{COLOR}}/${NEW_COLOR}/g" | \
      sed "s/{{GIT_SHA}}/${IMAGE_TAG}/g" | \
      kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" apply -f -
    
    # Wait for rollout
    echo -e "  Waiting for ${NEW_COLOR} deployment to be ready..."
    kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" rollout status deployment/safesoundarena-web-${NEW_COLOR} --timeout=300s
    
    # Update service to point to new deployment
    echo -e "  Switching traffic to ${NEW_COLOR}..."
    kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" patch service/safesoundarena-prod -p "{\"spec\":{\"selector\":{\"app.kubernetes.io/color\":\"${NEW_COLOR}\"}}}"
    
    # Scale down old deployment if it exists
    if [ -n "$CURRENT_COLOR" ]; then
      echo -e "  Scaling down ${CURRENT_COLOR} deployment..."
      kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" scale deployment/safesoundarena-web-${CURRENT_COLOR} --replicas=0
    fi
  else
    # For non-production environments, use standard deployment
    cat "${deployment}" | \
      sed "s/\$DOCKERHUB_USERNAME/${DOCKERHUB_USERNAME}/g" | \
      kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" apply -f -
    
    # Wait for rollout
    kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" rollout status deployment/safesoundarena-web --timeout=300s
  fi
done

# Apply services and ingress
echo -e "${YELLOW}Applying services and ingress...${NC}"
for service in $(find k8s/services -name "*.yaml" | sort); do
  echo "  - ${service}"
  envsubst < "${service}" | kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" apply -f -
done

# Apply HPA and affinity rules
kubectl ${KUBE_CONTEXT} apply -f k8s/autoscaling.yaml
kubectl ${KUBE_CONTEXT} apply -f k8s/affinity.yaml

# Verify resources
echo -e "${YELLOW}Verifying resources...${NC}"
kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" get pods,svc,ingress,hpa,pdb

echo -e "${GREEN}✅ Deployment to ${ENV} completed successfully!${NC}"

# Show service URLs
echo -e "\n${YELLOW}Service URLs:${NC}"
if [ "${ENV}" = "prod" ]; then
  echo "- Production: https://safesoundarena.com"
  echo "- www: https://www.safesoundarena.com"
else
  echo "- Staging: http://staging.safesoundarena.com"
  # Get NodePort or LoadBalancer IP if needed
  SERVICE_TYPE=$(kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" get svc safesoundarena-web -o jsonpath='{.spec.type}' 2>/dev/null || echo "")
  
  if [ "${SERVICE_TYPE}" = "LoadBalancer" ]; then
    EXTERNAL_IP=$(kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" get svc safesoundarena-web -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    echo "- LoadBalancer IP: ${EXTERNAL_IP}"
  elif [ "${SERVICE_TYPE}" = "NodePort" ]; then
    NODE_PORT=$(kubectl ${KUBE_CONTEXT} -n "${KUBE_NAMESPACE}" get svc safesoundarena-web -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "")
    if [ -n "${NODE_PORT}" ]; then
      NODE_IP=$(kubectl ${KUBE_CONTEXT} get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' 2>/dev/null || echo "<node-ip>")
      echo "- NodePort URL: http://${NODE_IP}:${NODE_PORT}"
    fi
  fi
fi
