# Monitoring and Operations Guide

This guide covers monitoring, alerting, incident response, and operational procedures for the Smart Ebook Chat System.

## Monitoring Overview

### Monitoring Stack

- **Metrics Collection**: Prometheus
- **Visualization**: Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger with OpenTelemetry
- **Alerting**: Alertmanager + PagerDuty
- **Uptime Monitoring**: External monitoring service

### Key Metrics

#### Application Metrics

**API Performance**
- Request latency (P50, P95, P99)
- Request rate (requests/second)
- Error rate (4xx, 5xx responses)
- Active connections

**Document Processing**
- Queue depth
- Processing time per document
- Success/failure rates
- Worker utilization

**AI Model Usage**
- Token consumption
- Model response times
- API failures per provider
- Cost tracking

**User Activity**
- Active users (DAU, MAU)
- Document uploads
- Chat sessions
- Search queries

#### Infrastructure Metrics

**System Resources**
- CPU utilization
- Memory usage
- Disk I/O
- Network I/O

**Database**
- Connection pool usage
- Query performance
- Slow query count
- Database size

**Cache Performance**
- Redis memory usage
- Cache hit/miss rates
- Eviction rates

## Grafana Dashboards

### 1. Application Overview Dashboard

**Panels:**
- Request rate and error rate
- Response time percentiles
- Active users
- Document processing queue
- Model usage distribution

**Alerts:**
- Error rate > 5%
- P99 latency > 5 seconds
- Queue depth > 100 items

### 2. Infrastructure Dashboard

**Panels:**
- CPU and memory usage across all services
- Database performance metrics
- Network and disk I/O
- Container resource usage

**Alerts:**
- CPU usage > 80%
- Memory usage > 90%
- Disk space < 10% free

### 3. Business Metrics Dashboard

**Panels:**
- Daily/monthly active users
- Document upload trends
- Revenue metrics
- Feature usage analytics

### 4. AI Model Performance Dashboard

**Panels:**
- Model response times by provider
- Token usage and costs
- Model availability and errors
- Quality metrics (if available)

### 5. Security Dashboard

**Panels:**
- Failed login attempts
- Rate limiting events
- Suspicious activity patterns
- Security alert counts

## Alerting Rules

### Critical Alerts (P1)

**Service Down**
```yaml
- alert: ServiceDown
  expr: up == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Service {{ $labels.instance }} is down"
```

**High Error Rate**
```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"
```

**Database Down**
```yaml
- alert: DatabaseDown
  expr: postgres_up == 0
  for: 30s
  labels:
    severity: critical
  annotations:
    summary: "Database is unreachable"
```

### Warning Alerts (P2)

**High Response Time**
```yaml
- alert: HighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High latency detected"
```

**Queue Backup**
```yaml
- alert: QueueBackup
  expr: celery_queue_length > 50
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Processing queue is backing up"
```

### Info Alerts (P3)

**Unusual Traffic**
```yaml
- alert: UnusualTraffic
  expr: rate(http_requests_total[5m]) > 100
  for: 10m
  labels:
    severity: info
  annotations:
    summary: "Traffic spike detected"
```

## Logging

### Log Levels

- **ERROR**: System errors, exceptions
- **WARN**: Unusual conditions, recoverable errors
- **INFO**: General application flow
- **DEBUG**: Detailed diagnostic information

### Log Format

```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "INFO",
  "service": "api",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "user123",
  "message": "Document uploaded successfully",
  "metadata": {
    "document_id": "doc123",
    "file_size": 1024000,
    "processing_time": 0.5
  }
}
```

### Important Log Patterns

**Security Events**
```json
{
  "level": "WARN",
  "event_type": "security",
  "action": "failed_login",
  "user_id": "user123",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

**Performance Issues**
```json
{
  "level": "WARN",
  "event_type": "performance",
  "operation": "document_processing",
  "duration": 30.5,
  "threshold": 10.0
}
```

**Business Events**
```json
{
  "level": "INFO",
  "event_type": "business",
  "action": "subscription_upgrade",
  "user_id": "user123",
  "from_plan": "free",
  "to_plan": "pro"
}
```

## Health Checks

### Application Health

**Basic Health Check**
```bash
GET /health
Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "version": "1.2.3"
}
```

**Detailed Health Check**
```bash
GET /health/detailed
Response: 200 OK
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "qdrant": "healthy",
    "minio": "healthy"
  },
  "workers": {
    "celery": "healthy",
    "active_tasks": 5
  }
}
```

### Service Dependencies

**Database Connection**
```python
def check_database():
    try:
        db.session.execute("SELECT 1")
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

**Redis Connection**
```python
def check_redis():
    try:
        redis_client.ping()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

## Incident Response

### Incident Severity Levels

**P1 - Critical**
- Complete service outage
- Data loss or corruption
- Security breach
- Response time: 15 minutes

**P2 - High**
- Partial service degradation
- Performance issues affecting users
- Failed deployments
- Response time: 1 hour

**P3 - Medium**
- Minor feature issues
- Non-critical bugs
- Monitoring alerts
- Response time: 4 hours

**P4 - Low**
- Documentation issues
- Cosmetic bugs
- Enhancement requests
- Response time: 24 hours

### Incident Response Process

1. **Detection**
   - Automated alerts
   - User reports
   - Monitoring dashboards

2. **Assessment**
   - Determine severity
   - Identify impact
   - Assign incident commander

3. **Response**
   - Assemble response team
   - Investigate root cause
   - Implement mitigation

4. **Resolution**
   - Deploy fix
   - Verify resolution
   - Monitor for recurrence

5. **Post-Incident**
   - Write incident report
   - Conduct blameless postmortem
   - Implement preventive measures

### Communication Templates

**Incident Notification**
```
🚨 INCIDENT ALERT - P1
Service: Smart Ebook Chat API
Issue: Service unavailable
Impact: All users affected
ETA: Investigating
Incident Commander: @john.doe
Status Page: https://status.example.com
```

**Resolution Notification**
```
✅ RESOLVED - P1 Incident
Service: Smart Ebook Chat API
Issue: Service unavailable - RESOLVED
Duration: 15 minutes
Root Cause: Database connection pool exhaustion
Actions Taken: Restarted database, increased pool size
```

## Backup and Recovery

### Backup Schedule

**Database Backups**
- Full backup: Daily at 2 AM UTC
- Incremental backup: Every 6 hours
- Retention: 30 days full, 7 days incremental
- Location: AWS S3 with cross-region replication

**File Storage Backups**
- MinIO data: Daily sync to S3
- Retention: 90 days
- Versioning: Enabled

**Configuration Backups**
- Kubernetes manifests: Git repository
- Grafana dashboards: Exported nightly
- Prometheus rules: Version controlled

### Recovery Procedures

**Database Recovery**
```bash
# Restore from backup
pg_restore -h localhost -U postgres -d smartchat backup_file.sql

# Verify data integrity
psql -h localhost -U postgres -d smartchat -c "SELECT COUNT(*) FROM documents;"
```

**File Storage Recovery**
```bash
# Restore MinIO data
aws s3 sync s3://backup-bucket/minio-data/ /data/minio/

# Restart MinIO service
kubectl rollout restart deployment/minio
```

**Full System Recovery**
```bash
# Restore infrastructure
terraform apply

# Deploy application
kubectl apply -f k8s/

# Restore data
./scripts/restore-backup.sh

# Verify services
kubectl get pods
curl -f http://api.example.com/health
```

### Disaster Recovery

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour

**DR Runbook**
1. Assess damage and scope
2. Activate DR team
3. Provision infrastructure in DR region
4. Restore data from backups
5. Update DNS to point to DR environment
6. Verify all services operational
7. Communicate status to users

## Performance Optimization

### Database Optimization

**Query Performance**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE tablename = 'documents';
```

**Connection Pool Tuning**
```python
# PostgreSQL settings
max_connections = 100
shared_buffers = 256MB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### Application Performance

**Caching Strategy**
- Redis for session data
- Application-level caching for frequent queries
- CDN for static assets

**Queue Optimization**
```python
# Celery worker settings
CELERY_WORKER_CONCURRENCY = 4
CELERY_TASK_COMPRESSION = 'gzip'
CELERY_RESULT_COMPRESSION = 'gzip'
CELERY_TASK_SERIALIZER = 'pickle'
```

### Resource Scaling

**Horizontal Pod Autoscaler**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Vertical Pod Autoscaler**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Auto"
```

## Security Operations

### Security Monitoring

**Failed Authentication Attempts**
```promql
increase(auth_failures_total[5m]) > 10
```

**Unusual Access Patterns**
```promql
rate(http_requests_total{status="403"}[5m]) > 0.1
```

**Suspicious File Uploads**
```promql
increase(file_upload_rejected_total[5m]) > 5
```

### Security Incident Response

1. **Immediate Actions**
   - Block suspicious IPs
   - Revoke compromised tokens
   - Notify security team

2. **Investigation**
   - Analyze logs and traces
   - Identify attack vectors
   - Assess impact

3. **Containment**
   - Patch vulnerabilities
   - Update security rules
   - Monitor for recurrence

### Regular Security Tasks

**Daily**
- Review security alerts
- Check failed login patterns
- Monitor rate limiting events

**Weekly**
- Dependency vulnerability scans
- Security log analysis
- Access review

**Monthly**
- Security assessment
- Penetration testing results
- Security training updates

## Capacity Planning

### Usage Trends

**Growth Metrics**
- User growth rate: 10% monthly
- Document upload growth: 15% monthly
- API usage growth: 20% monthly

**Resource Utilization**
- CPU: Average 60%, Peak 85%
- Memory: Average 70%, Peak 90%
- Storage: 50TB total, 5TB monthly growth

### Scaling Projections

**6-Month Projections**
- Users: 10,000 → 17,900 (79% increase)
- Documents: 1M → 2.4M (140% increase)
- Storage: 50TB → 80TB (60% increase)

**Infrastructure Requirements**
- Additional 4 worker nodes
- Database storage expansion
- Increased bandwidth allocation

## Maintenance Procedures

### Planned Maintenance

**Database Maintenance**
```bash
# Weekly VACUUM and REINDEX
psql -h localhost -U postgres -d smartchat -c "VACUUM ANALYZE;"
psql -h localhost -U postgres -d smartchat -c "REINDEX DATABASE smartchat;"
```

**Log Rotation**
```bash
# Elasticsearch index cleanup
curator delete indices --older-than 30 --time-unit days
```

**Certificate Renewal**
```bash
# Let's Encrypt renewal
certbot renew --dry-run
kubectl create secret tls api-tls --cert=cert.pem --key=key.pem
```

### Emergency Procedures

**Service Restart Sequence**
1. Drain traffic from load balancer
2. Stop application servers
3. Restart dependencies (DB, Redis)
4. Start application servers
5. Restore traffic

**Rollback Procedure**
```bash
# Kubernetes rollback
kubectl rollout undo deployment/api
kubectl rollout undo deployment/workers

# Database rollback (if needed)
pg_restore -h localhost -U postgres -d smartchat previous_backup.sql
```

## Contact Information

### On-Call Rotation

**Primary On-Call**: DevOps Engineer
**Secondary On-Call**: Senior Developer
**Escalation**: Engineering Manager

### Emergency Contacts

- **PagerDuty**: +1-XXX-XXX-XXXX
- **Slack**: #incidents channel
- **Email**: incidents@company.com

### Vendor Contacts

- **AWS Support**: Enterprise support plan
- **Database Support**: PostgreSQL consulting
- **Security**: Security vendor contact 