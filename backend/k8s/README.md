# Kubernetes Deployment Manifests

This directory contains comprehensive Kubernetes deployment manifests for the Smart Ebook Chat System, organized using Kustomize for environment-specific configurations.

## Directory Structure

```
k8s/
├── base/                    # Base Kubernetes manifests
│   ├── namespace.yaml       # Namespace definition
│   ├── rbac.yaml           # ServiceAccount, Role, RoleBinding
│   ├── configmap.yaml      # Application configuration
│   ├── secrets.yaml        # Secret templates (CHANGE VALUES!)
│   ├── persistent-volumes.yaml  # PVC definitions
│   ├── backend-deployment.yaml  # Backend API deployment
│   ├── frontend-deployment.yaml # Frontend deployment
│   ├── celery-deployment.yaml   # Celery worker with HPA
│   ├── database-deployments.yaml # PostgreSQL, Redis, Qdrant, MinIO
│   ├── ingress.yaml        # Ingress controllers with SSL
│   ├── network-policies.yaml    # Network security policies
│   └── kustomization.yaml  # Base kustomization
├── overlays/               # Environment-specific overlays
│   ├── development/        # Development environment
│   ├── staging/           # Staging environment
│   └── production/        # Production environment
│       ├── kustomization.yaml
│       ├── replica-patch.yaml
│       ├── resource-patch.yaml
│       └── ingress-patch.yaml
└── configs/               # Additional configuration files
```

## Architecture Overview

### Application Components

- **Backend API** (FastAPI): 2-3 replicas with health checks and auto-scaling
- **Frontend** (Gatsby/nginx): 2-3 replicas serving static content
- **Celery Workers**: 3-5 replicas with HPA based on CPU/memory
- **PostgreSQL**: Single instance with persistent storage
- **Redis**: Single instance for caching and message broker
- **Qdrant**: Vector database for document embeddings
- **MinIO**: S3-compatible object storage

### Security Features

- **Network Policies**: Default deny-all with specific allow rules
- **RBAC**: Minimal permissions for service accounts
- **Pod Security**: Non-root containers, read-only filesystems
- **SSL/TLS**: Automatic certificate management with cert-manager
- **Secret Management**: Encrypted storage for sensitive data

### Scalability Features

- **Horizontal Pod Autoscaler**: Automatic scaling for worker pods
- **Resource Limits**: Proper CPU/memory limits for all pods
- **Persistent Storage**: Separate PVCs for each database component
- **Load Balancing**: nginx ingress with SSL termination

## Prerequisites

### Required Infrastructure
- Kubernetes cluster (v1.20+)
- nginx Ingress Controller
- cert-manager for SSL certificates
- Persistent storage provisioner
- DNS management for domain names

### Required Tools
- kubectl
- kustomize (built into kubectl 1.14+)
- helm (optional, for easier cluster setup)

## Deployment Instructions

### 1. Pre-deployment Setup

#### Install Required Cluster Components

```bash
# Install nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL certificates
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Configure Secrets

**⚠️ IMPORTANT: Update all secret values before deployment!**

Edit `base/secrets.yaml` and replace all `CHANGE_THIS_*` placeholders:

```bash
# Edit secrets with real values
kubectl create secret generic database-secrets \
  --from-literal=POSTGRES_USER=your_db_user \
  --from-literal=POSTGRES_PASSWORD=your_secure_password \
  --from-literal=DATABASE_URL=postgresql://your_db_user:your_secure_password@postgresql:5432/smart_ebook_chat \
  --dry-run=client -o yaml > temp-db-secrets.yaml
```

### 3. Deploy Application

#### Development Environment
```bash
# Deploy to development
kubectl apply -k overlays/development/
```

#### Staging Environment
```bash
# Deploy to staging
kubectl apply -k overlays/staging/
```

#### Production Environment
```bash
# Update domain names in ingress-patch.yaml
# Update resource limits as needed
# Deploy to production
kubectl apply -k overlays/production/
```

### 4. Verify Deployment

```bash
# Check namespace and pods
kubectl get namespace smart-ebook-chat
kubectl get pods -n smart-ebook-chat

# Check services and ingress
kubectl get services -n smart-ebook-chat
kubectl get ingress -n smart-ebook-chat

# Check persistent volumes
kubectl get pvc -n smart-ebook-chat

# Check HPA status
kubectl get hpa -n smart-ebook-chat
```

### 5. Access Application

Once deployed, access the application at:
- **Frontend**: https://yourdomain.com
- **Backend API**: https://api.yourdomain.com
- **API Documentation**: https://api.yourdomain.com/docs

## Environment-Specific Configurations

### Development
- Single replica for most services
- Relaxed resource limits
- Debug logging enabled
- Local domain names (*.local)

### Staging
- Production-like replica counts
- Moderate resource limits
- Info-level logging
- Staging domain names

### Production
- High replica counts (3-5)
- Strict resource limits
- Warning-level logging
- Production domain names
- Enhanced security settings

## Scaling Operations

### Manual Scaling
```bash
# Scale backend replicas
kubectl scale deployment backend --replicas=5 -n smart-ebook-chat

# Scale Celery workers
kubectl scale deployment celery-worker --replicas=10 -n smart-ebook-chat
```

### Horizontal Pod Autoscaler
```bash
# Check current HPA status
kubectl get hpa celery-worker-hpa -n smart-ebook-chat

# Modify HPA settings
kubectl edit hpa celery-worker-hpa -n smart-ebook-chat
```

## Monitoring and Troubleshooting

### Check Pod Health
```bash
# Get pod status
kubectl get pods -n smart-ebook-chat

# Check pod logs
kubectl logs -f deployment/backend -n smart-ebook-chat
kubectl logs -f deployment/celery-worker -n smart-ebook-chat

# Check events
kubectl get events -n smart-ebook-chat --sort-by='.lastTimestamp'
```

### Debug Networking
```bash
# Test service connectivity
kubectl exec -it deployment/backend -n smart-ebook-chat -- curl http://postgresql:5432

# Check network policies
kubectl get networkpolicies -n smart-ebook-chat
kubectl describe networkpolicy default-deny-all -n smart-ebook-chat
```

### Check Storage
```bash
# Verify PVC status
kubectl get pvc -n smart-ebook-chat
kubectl describe pvc postgresql-pvc -n smart-ebook-chat

# Check storage usage
kubectl exec -it deployment/postgresql -n smart-ebook-chat -- df -h
```

## Backup and Recovery

### Database Backup
```bash
# Create database backup job
kubectl create job postgresql-backup --from=cronjob/postgresql-backup -n smart-ebook-chat

# Manual backup
kubectl exec -it deployment/postgresql -n smart-ebook-chat -- pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

### Persistent Volume Snapshots
```bash
# Create volume snapshot (if supported by storage class)
kubectl create -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgresql-snapshot
  namespace: smart-ebook-chat
spec:
  source:
    persistentVolumeClaimName: postgresql-pvc
EOF
```

## Security Considerations

### Secret Management
- Use external secret management (e.g., HashiCorp Vault, AWS Secrets Manager)
- Rotate secrets regularly
- Use separate secrets for each environment

### Network Security
- Network policies enforce least-privilege access
- All external traffic goes through ingress controller
- Inter-pod communication is restricted

### Pod Security
- All containers run as non-root users
- Read-only root filesystems where possible
- Security contexts drop all capabilities

### SSL/TLS
- Automatic certificate provisioning with cert-manager
- Force SSL redirect for all traffic
- HSTS headers enabled

## Updating and Maintenance

### Rolling Updates
```bash
# Update image tags in kustomization.yaml
# Apply changes for rolling update
kubectl apply -k overlays/production/

# Monitor rollout
kubectl rollout status deployment/backend -n smart-ebook-chat
```

### Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/backend -n smart-ebook-chat

# Check rollout history
kubectl rollout history deployment/backend -n smart-ebook-chat
```

### Maintenance Mode
```bash
# Scale down to maintenance mode
kubectl scale deployment backend --replicas=0 -n smart-ebook-chat
kubectl scale deployment frontend --replicas=0 -n smart-ebook-chat

# Scale back up
kubectl scale deployment backend --replicas=3 -n smart-ebook-chat
kubectl scale deployment frontend --replicas=3 -n smart-ebook-chat
```

## Cost Optimization

### Resource Optimization
- Use Vertical Pod Autoscaler for right-sizing
- Monitor resource usage with metrics
- Use spot instances for worker nodes (if applicable)

### Storage Optimization
- Use appropriate storage classes
- Implement lifecycle policies for object storage
- Regular cleanup of old data

## Support and Troubleshooting

### Common Issues

1. **Pod CrashLoopBackOff**
   ```bash
   kubectl logs <pod-name> -n smart-ebook-chat --previous
   kubectl describe pod <pod-name> -n smart-ebook-chat
   ```

2. **ImagePullBackOff**
   - Check image repository access
   - Verify image tags exist
   - Check imagePullSecrets if using private registry

3. **Persistent Volume Issues**
   ```bash
   kubectl get pv
   kubectl describe pvc <pvc-name> -n smart-ebook-chat
   ```

4. **Service Discovery Issues**
   ```bash
   kubectl get endpoints -n smart-ebook-chat
   kubectl exec -it <pod> -n smart-ebook-chat -- nslookup <service-name>
   ```

### Getting Help
- Check application logs for errors
- Review Kubernetes events
- Verify network policies allow required traffic
- Ensure all secrets are properly configured
- Check resource limits and quotas

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/) 