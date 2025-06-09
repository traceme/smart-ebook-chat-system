# Deployment Guide

This guide covers deploying the Smart Ebook Chat System using Docker and Docker Compose across different environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Compose Configurations](#docker-compose-configurations)
4. [Deployment Commands](#deployment-commands)
5. [Environment-Specific Instructions](#environment-specific-instructions)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Backup and Recovery](#backup-and-recovery)

## Prerequisites

### Required Software
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- Make (optional, for Makefile commands)

### System Requirements
- **Development**: 4GB RAM, 2 CPU cores, 20GB disk
- **Staging**: 8GB RAM, 4 CPU cores, 50GB disk
- **Production**: 16GB RAM, 8 CPU cores, 100GB+ disk

## Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd smart-ebook-chat-system/backend
```

### 2. Configure Environment Files

Copy the example environment file for your target environment:

```bash
# Development
cp env.example env.dev

# Staging
cp env.example env.staging

# Production
cp env.example env.prod
```

### 3. Update Environment Variables

Edit the appropriate environment file and update all `CHANGE_THIS_*` placeholders with actual values.

**Critical Variables to Update:**
- Database passwords
- JWT secret keys
- MinIO access keys
- API keys for LLM providers
- SMTP credentials
- SSL certificate paths (staging/production)

## Docker Compose Configurations

### Available Configurations

| File | Environment | Purpose |
|------|-------------|---------|
| `docker-compose.yml` | Development | Original development setup |
| `docker-compose.dev.yml` | Development | Enhanced development with debugging tools |
| `docker-compose.staging.yml` | Staging | Production-like testing environment |
| `docker-compose.prod.yml` | Production | Optimized for production deployment |

### Service Architecture

#### Core Services
- **backend**: FastAPI application server
- **frontend**: Gatsby static site served by nginx
- **celery-worker**: Background task processor
- **db**: PostgreSQL database
- **redis**: Cache and message broker
- **qdrant**: Vector database for search
- **minio**: Object storage for documents

#### Development Tools (dev environment only)
- **celery-flower**: Celery monitoring
- **mailhog**: Email testing
- **pgadmin**: Database administration

#### Monitoring (staging/production)
- **prometheus**: Metrics collection
- **grafana**: Metrics visualization
- **nginx**: Load balancer (production)

## Deployment Commands

### Using the Startup Script (Recommended)

```bash
# Start development environment
./scripts/docker-startup.sh dev up

# Start staging environment
./scripts/docker-startup.sh staging up

# Start production environment
./scripts/docker-startup.sh prod up

# View logs
./scripts/docker-startup.sh dev logs

# Stop services
./scripts/docker-startup.sh dev down

# Rebuild images
./scripts/docker-startup.sh dev build

# Check service status
./scripts/docker-startup.sh dev status

# Clean up (removes volumes!)
./scripts/docker-startup.sh dev clean
```

### Using Docker Compose Directly

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Staging
docker-compose -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Environment-Specific Instructions

### Development Environment

**Features:**
- Hot reloading for backend and frontend
- Debug logging enabled
- Development tools included
- Trust authentication for PostgreSQL
- Relaxed security settings

**Setup:**
1. Ensure `env.dev` is configured
2. Start services: `./scripts/docker-startup.sh dev up`
3. Access services:
   - Backend API: http://localhost:8000
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:8000/docs
   - Flower: http://localhost:5555
   - MailHog: http://localhost:8025
   - pgAdmin: http://localhost:5050

### Staging Environment

**Features:**
- Production-like configuration
- SSL/TLS enabled
- Monitoring with Prometheus/Grafana
- Real SMTP for email testing
- Resource limits applied

**Setup:**
1. Configure SSL certificates in `/etc/ssl/`
2. Update `env.staging` with real credentials
3. Start services: `./scripts/docker-startup.sh staging up`
4. Access services:
   - Backend API: https://staging-api.example.com
   - Frontend: https://staging.example.com
   - Grafana: http://localhost:3001

**SSL Certificate Setup:**
```bash
# Using Let's Encrypt (example)
sudo certbot --nginx -d staging.example.com -d staging-api.example.com
```

### Production Environment

**Features:**
- Multi-replica deployment
- Encrypted networks
- Strict security policies
- Comprehensive monitoring
- Automated health checks
- Rolling updates support

**Setup:**
1. **Security Review**: Audit all configuration files
2. **Secrets Management**: Use Docker secrets or external secret management
3. **SSL Certificates**: Configure production SSL certificates
4. **Environment Variables**: Update `env.prod` with production values
5. **Resource Planning**: Ensure adequate server resources
6. **Backup Strategy**: Configure automated backups

**Deployment:**
```bash
# Initialize Docker Swarm (if using swarm mode)
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml smart-ebook-chat

# Or use regular docker-compose
./scripts/docker-startup.sh prod up
```

**Production Checklist:**
- [ ] All secrets are changed from defaults
- [ ] SSL certificates are valid and configured
- [ ] Backup strategy is implemented
- [ ] Monitoring is configured and tested
- [ ] Log aggregation is set up
- [ ] Resource limits are appropriate
- [ ] Security scan completed
- [ ] Load testing performed

## Monitoring and Troubleshooting

### Health Checks

All services include health checks. Check service health:

```bash
# View service status
docker-compose -f docker-compose.prod.yml ps

# Check specific service logs
docker-compose -f docker-compose.prod.yml logs backend

# Monitor resource usage
docker stats
```

### Common Issues

#### Backend Won't Start
1. Check environment variables: `docker-compose logs backend`
2. Verify database connectivity: `docker-compose exec backend ping db`
3. Check port conflicts: `netstat -tulpn | grep :8000`

#### Database Connection Issues
1. Verify PostgreSQL is running: `docker-compose ps db`
2. Check database logs: `docker-compose logs db`
3. Test connection: `docker-compose exec backend psql $DATABASE_URL`

#### MinIO Storage Issues
1. Check MinIO logs: `docker-compose logs minio`
2. Verify bucket creation: Access MinIO console
3. Check network connectivity: `docker-compose exec backend ping minio`

### Performance Monitoring

#### Key Metrics to Monitor
- CPU and memory usage per service
- Database connection pool usage
- Redis memory usage
- MinIO storage usage
- Request latency and throughput
- Celery queue length

#### Grafana Dashboards
- Application Performance Monitoring
- Infrastructure Metrics
- Database Performance
- Celery Queue Monitoring
- Business Metrics

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Restore backup
docker-compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

### MinIO Backup

```bash
# Backup MinIO data
docker-compose exec minio mc mirror /data /backup/minio-data

# Restore MinIO data
docker-compose exec minio mc mirror /backup/minio-data /data
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh - Automated backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$DATE"

mkdir -p "$BACKUP_DIR"

# Database backup
docker-compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > "$BACKUP_DIR/database.sql"

# MinIO backup
docker-compose exec minio mc mirror /data "$BACKUP_DIR/minio"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

## Security Considerations

### Production Security Checklist
- [ ] Change all default passwords and secrets
- [ ] Use strong, unique passwords (consider password manager)
- [ ] Enable SSL/TLS for all external communications
- [ ] Configure proper firewall rules
- [ ] Use Docker secrets for sensitive data
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Network segmentation
- [ ] Access control (RBAC)
- [ ] Vulnerability scanning

### Network Security
- Use encrypted overlay networks in production
- Implement proper firewall rules
- Consider using VPN for administrative access
- Enable audit logging for all access

## Scaling

### Horizontal Scaling
```bash
# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale Celery workers
docker-compose -f docker-compose.prod.yml up -d --scale celery-worker=5
```

### Load Balancing
- nginx is configured as a load balancer in production
- Consider external load balancers for high availability
- Use health checks for proper traffic routing

## Support

For issues and questions:
1. Check logs: `./scripts/docker-startup.sh [env] logs`
2. Review this documentation
3. Check the project's issue tracker
4. Contact the development team

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation) 