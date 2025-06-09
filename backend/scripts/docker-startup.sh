#!/bin/bash

# Docker Startup Script for Smart Ebook Chat System
# Usage: ./scripts/docker-startup.sh [environment] [action]
# Environment: dev, staging, prod
# Action: up, down, restart, logs, build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-dev}
ACTION=${2:-up}

# Valid environments and actions
VALID_ENVIRONMENTS=("dev" "staging" "prod")
VALID_ACTIONS=("up" "down" "restart" "logs" "build" "status" "clean")

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if value is in array
contains_element() {
    local e match="$1"
    shift
    for e; do [[ "$e" == "$match" ]] && return 0; done
    return 1
}

# Validate inputs
if ! contains_element "$ENVIRONMENT" "${VALID_ENVIRONMENTS[@]}"; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_info "Valid environments: ${VALID_ENVIRONMENTS[*]}"
    exit 1
fi

if ! contains_element "$ACTION" "${VALID_ACTIONS[@]}"; then
    print_error "Invalid action: $ACTION"
    print_info "Valid actions: ${VALID_ACTIONS[*]}"
    exit 1
fi

# Set Docker Compose file based on environment
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
ENV_FILE="env.${ENVIRONMENT}"

# Check if files exist
if [[ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
    print_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

if [[ ! -f "$PROJECT_ROOT/$ENV_FILE" ]]; then
    print_warning "Environment file not found: $ENV_FILE"
    print_info "Please create $ENV_FILE or copy from env.example"
fi

# Change to project directory
cd "$PROJECT_ROOT"

print_info "Environment: $ENVIRONMENT"
print_info "Action: $ACTION"
print_info "Compose file: $COMPOSE_FILE"

# Execute action
case $ACTION in
    "up")
        print_info "Starting services..."
        if [[ "$ENVIRONMENT" == "prod" ]]; then
            print_warning "Starting production environment. Make sure all secrets are configured!"
            read -p "Continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Aborted."
                exit 0
            fi
        fi
        docker-compose -f "$COMPOSE_FILE" up -d
        print_success "Services started successfully!"
        print_info "Use './scripts/docker-startup.sh $ENVIRONMENT logs' to view logs"
        ;;
    
    "down")
        print_info "Stopping services..."
        docker-compose -f "$COMPOSE_FILE" down
        print_success "Services stopped successfully!"
        ;;
    
    "restart")
        print_info "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart
        print_success "Services restarted successfully!"
        ;;
    
    "logs")
        print_info "Showing logs..."
        docker-compose -f "$COMPOSE_FILE" logs -f --tail=100
        ;;
    
    "build")
        print_info "Building images..."
        if [[ "$ENVIRONMENT" == "prod" ]]; then
            print_info "Building production images with cache disabled..."
            docker-compose -f "$COMPOSE_FILE" build --no-cache
        else
            docker-compose -f "$COMPOSE_FILE" build
        fi
        print_success "Build completed successfully!"
        ;;
    
    "status")
        print_info "Service status:"
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    
    "clean")
        print_warning "This will remove all containers, networks, and volumes for $ENVIRONMENT"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Cleaning up..."
            docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
            docker system prune -f
            print_success "Cleanup completed!"
        else
            print_info "Cleanup cancelled."
        fi
        ;;
esac

# Show helpful information
if [[ "$ACTION" == "up" ]]; then
    echo
    print_info "=== Service Information ==="
    case $ENVIRONMENT in
        "dev")
            echo "Backend API: http://localhost:8000"
            echo "Frontend: http://localhost:3000"
            echo "API Docs: http://localhost:8000/docs"
            echo "MinIO Console: http://localhost:9001"
            echo "Qdrant Dashboard: http://localhost:6333/dashboard"
            echo "Flower (Celery): http://localhost:5555"
            echo "MailHog: http://localhost:8025"
            echo "pgAdmin: http://localhost:5050"
            ;;
        "staging")
            echo "Backend API: https://staging-api.example.com"
            echo "Frontend: https://staging.example.com"
            echo "Grafana: http://localhost:3001"
            echo "Prometheus: http://localhost:9090"
            ;;
        "prod")
            echo "Backend API: https://api.yourdomain.com"
            echo "Frontend: https://yourdomain.com"
            print_warning "Production environment - monitor all services carefully!"
            ;;
    esac
    echo
fi 