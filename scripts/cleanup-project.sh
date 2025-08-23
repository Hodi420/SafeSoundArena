#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT=$(pwd)

# Directories to clean up (relative to project root)
CLEANUP_DIRS=(
  "**/__pycache__"
  "**/*.pyc"
  "**/*.pyo"
  "**/*.pyd"
  "**/.pytest_cache"
  "**/node_modules/.cache"
  "**/.DS_Store"
  "**/Thumbs.db"
  "**/.ipynb_checkpoints"
  "**/*.log"
  "**/npm-debug.log*"
  "**/yarn-debug.log*"
  "**/yarn-error.log*"
  "**/.env.local"
  "**/.env.development.local"
  "**/.env.test.local"
  "**/.env.production.local"
  "**/build"
  "**/dist"
  "**/coverage"
  "**/.next"
  "**/out"
  "**/.serverless"
  "**/.serverless_nextjs"
  "**/.vercel"
  "**/.netlify"
)

# Files to keep (won't be deleted)
KEEP_FILES=(
  "package.json"
  "package-lock.json"
  "yarn.lock"
  "tsconfig.json"
  "next.config.js"
  "README.md"
  ".gitignore"
  ".env.example"
  ".env.local.example"
  "docker-compose.yml"
  "deploy/docker-compose.yml"
)

# Function to check if a file should be kept
should_keep_file() {
  local file_path=$1
  
  for keep_file in "${KEEP_FILES[@]}"; do
    if [[ $file_path == *"$keep_file" ]]; then
      return 0  # File should be kept
    fi
  done
  
  return 1  # File can be deleted
}

# Function to clean up directories and files
cleanup() {
  echo -e "${YELLOW}🚀 Starting project cleanup...${NC}"
  
  # Remove directories
  for pattern in "${CLEANUP_DIRS[@]}"; do
    echo -e "\n${GREEN}Cleaning up ${pattern}...${NC}"
    find $PROJECT_ROOT -type d -name "${pattern#**/}" -exec rm -rf {} + 2>/dev/null || true
  done
  
  # Remove files
  for pattern in "${CLEANUP_DIRS[@]}"; do
    if [[ $pattern == *"."* ]]; then  # If it's a file pattern
      echo -e "\n${GREEN}Removing ${pattern} files...${NC}"
      find $PROJECT_ROOT -type f -name "${pattern#**/}" | while read -r file; do
        if ! should_keep_file "$file"; then
          echo "Removing $file"
          rm -f "$file" 2>/dev/null || true
        else
          echo "Keeping $file (protected)"
        fi
      done
    fi
  done
  
  # Clean npm/yarn cache
  echo -e "\n${GREEN}Cleaning npm/yarn cache...${NC}"
  npm cache clean --force 2>/dev/null || true
  yarn cache clean 2>/dev/null || true
  
  # Remove node_modules and reinstall
  if [ -d "node_modules" ]; then
    echo -e "\n${GREEN}Removing node_modules...${NC}"
    rm -rf node_modules
  fi
  
  # Reinstall dependencies
  echo -e "\n${GREEN}Reinstalling dependencies...${NC}"
  if [ -f "yarn.lock" ]; then
    yarn install --frozen-lockfile
  else
    npm ci
  fi
  
  echo -e "\n${GREEN}✅ Project cleanup complete!${NC}"
}

# Function to check project configuration
check_configuration() {
  echo -e "\n${YELLOW}🔍 Checking project configuration...${NC}"
  
  # Check Node.js version
  echo -e "\n${GREEN}Node.js version:${NC}"
  node -v
  
  # Check npm/yarn version
  if [ -f "yarn.lock" ]; then
    echo -e "\n${GREEN}Yarn version:${NC}"
    yarn -v
  else
    echo -e "\n${GREEN}npm version:${NC}"
    npm -v
  fi
  
  # Check TypeScript if used
  if [ -f "tsconfig.json" ]; then
    echo -e "\n${GREEN}TypeScript version:${NC}"
    npx tsc -v
  fi
  
  # Check Next.js if used
  if [ -f "next.config.js" ]; then
    echo -e "\n${GREEN}Next.js version:${NC}"
    npx next -v
  fi
  
  # Check Docker if used
  if [ -f "Dockerfile" ] || [ -f "docker-compose.yml" ]; then
    echo -e "\n${GREEN}Docker version:${NC}"
    docker --version
    docker-compose --version
  fi
  
  echo -e "\n${GREEN}✅ Configuration check complete!${NC}"
}

# Function to check for compatibility issues
check_compatibility() {
  echo -e "\n${YELLOW}🔍 Checking for compatibility issues...${NC}"
  
  # Check for deprecated packages
  echo -e "\n${GREEN}Checking for deprecated packages...${NC}"
  if [ -f "yarn.lock" ]; then
    yarn list --pattern "@deprecated" --depth=0 2>/dev/null || true
  else
    npm ls --depth=0 2>/dev/null || true
  fi
  
  # Check for vulnerable packages
  echo -e "\n${GREEN}Checking for vulnerable packages...${NC}"
  npx npm-audit || npx yarn audit || echo "Audit not available"
  
  # Check for outdated packages
  echo -e "\n${GREEN}Checking for outdated packages...${NC}"
  if [ -f "yarn.lock" ]; then
    yarn outdated || true
  else
    npm outdated || true
  fi
  
  echo -e "\n${GREEN}✅ Compatibility check complete!${NC}"
}

# Main menu
show_menu() {
  echo -e "\n${YELLOW}SafeSoundArena Project Cleanup${NC}"
  echo -e "1. Clean up project (remove node_modules, caches, etc.)"
  echo -e "2. Check project configuration"
  echo -e "3. Check for compatibility issues"
  echo -e "4. Run full cleanup and checks"
  echo -e "0. Exit"
  
  read -p "Choose an option (0-4): " choice
  
  case $choice in
    1) cleanup ;;
    2) check_configuration ;;
    3) check_compatibility ;;
    4) 
      cleanup
      check_configuration
      check_compatibility
      ;;
    0) 
      echo -e "\n${GREEN}👋 Exiting...${NC}"
      exit 0
      ;;
    *) 
      echo -e "\n${RED}❌ Invalid option. Please try again.${NC}"
      show_menu
      ;;
  esac
}

# Check if running with arguments
if [ "$#" -gt 0 ]; then
  case $1 in
    --clean) cleanup ;;
    --check) check_configuration ;;
    --compat) check_compatibility ;;
    --all)
      cleanup
      check_configuration
      check_compatibility
      ;;
    *)
      echo "Usage: $0 [--clean|--check|--compat|--all]"
      exit 1
      ;;
  esac
else
  show_menu
fi
