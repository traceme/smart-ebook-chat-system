from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import HTTPBearer
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

from app.core.config import settings
from app.core.security import (
    rbac_manager, jwt_manager, ip_restriction_manager, 
    data_encryption, api_key_storage, password_security,
    Permission, SecurityError, AuthenticationError, AuthorizationError
)
from app.core.vulnerability_scanner import vulnerability_manager, test_password_strength
from app.middleware.security import RateLimitConfig
from app.models.user import User
from app.crud.user import get_current_user

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/security", tags=["security"])

# ============================================================================
# SECURITY CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/config", summary="Get security configuration")
async def get_security_config(current_user: User = Depends(get_current_user)):
    """Get current security configuration (admin only)"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_SYSTEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    return {
        "security_config": settings.security_config,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/status", summary="Get security status overview")
async def get_security_status(current_user: User = Depends(get_current_user)):
    """Get overall security status"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Get latest vulnerability scan report
    latest_scan = vulnerability_manager.get_latest_report()
    
    security_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "encryption_enabled": settings.DATA_ENCRYPTION_ENABLED,
        "audit_logging_enabled": settings.AUDIT_LOGGING_ENABLED,
        "rate_limiting_enabled": settings.RATE_LIMIT_ENABLED,
        "vulnerability_scanning_enabled": settings.VULNERABILITY_SCANNING_ENABLED,
        "owasp_protection_enabled": settings.OWASP_TOP10_PROTECTION,
        "latest_vulnerability_scan": latest_scan.get("scan_time") if latest_scan else None,
        "vulnerabilities_found": latest_scan.get("results", {}).get("vulnerabilities_found", 0) if latest_scan else 0
    }
    
    return security_status

# ============================================================================
# VULNERABILITY SCANNING ENDPOINTS
# ============================================================================

@router.post("/scan/dependencies", summary="Run dependency vulnerability scan")
async def run_dependency_scan(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Run dependency vulnerability scan"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_SYSTEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Run scan in background
    background_tasks.add_task(vulnerability_manager.run_dependency_scan)
    
    return {
        "message": "Dependency vulnerability scan initiated",
        "scan_id": f"dep_scan_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/scan/reports", summary="Get vulnerability scan reports")
async def get_scan_reports(current_user: User = Depends(get_current_user)):
    """Get latest vulnerability scan reports"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    latest_report = vulnerability_manager.get_latest_report()
    
    if not latest_report:
        return {
            "message": "No scan reports available",
            "reports": []
        }
    
    return {
        "latest_report": latest_report,
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# PASSWORD SECURITY TESTING
# ============================================================================

@router.post("/test/password", summary="Test password strength")
async def test_password(
    password_data: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """Test password strength and complexity"""
    password = password_data.get("password")
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    # Test password strength
    result = test_password_strength(password)
    
    return {
        "password_test": result,
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# ENCRYPTION TESTING
# ============================================================================

@router.post("/test/encryption", summary="Test data encryption")
async def test_encryption(
    test_data: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """Test data encryption and decryption"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_SYSTEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    data = test_data.get("data", "test data")
    
    try:
        # Test encryption
        encrypted = data_encryption.encrypt(data)
        
        # Test decryption
        decrypted = data_encryption.decrypt(encrypted)
        
        return {
            "encryption_test": {
                "original_data": data,
                "encrypted_length": len(encrypted),
                "decryption_successful": data == decrypted,
                "encryption_working": True
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Encryption test failed: {e}")
        return {
            "encryption_test": {
                "encryption_working": False,
                "error": str(e)
            },
            "timestamp": datetime.utcnow().isoformat()
        }

# ============================================================================
# ROLE-BASED ACCESS CONTROL
# ============================================================================

@router.get("/rbac/permissions/{role}", summary="Get permissions for role")
async def get_role_permissions(
    role: str,
    current_user: User = Depends(get_current_user)
):
    """Get all permissions for a specific role"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_USERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    permissions = rbac_manager.get_user_permissions(role)
    
    return {
        "role": role,
        "permissions": permissions,
        "permission_count": len(permissions),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/rbac/check", summary="Check permission for user")
async def check_permission(
    permission_data: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """Check if current user has specific permission"""
    required_permission = permission_data.get("permission")
    if not required_permission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission is required"
        )
    
    has_permission = rbac_manager.check_permission(current_user.role, required_permission)
    
    return {
        "user_role": current_user.role,
        "required_permission": required_permission,
        "has_permission": has_permission,
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# IP RESTRICTIONS MANAGEMENT
# ============================================================================

@router.get("/ip-restrictions", summary="Get IP restrictions")
async def get_ip_restrictions(current_user: User = Depends(get_current_user)):
    """Get current IP restrictions configuration"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_SYSTEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    return {
        "ip_restrictions": {
            "blocked_ips": list(ip_restriction_manager.blocked_ips),
            "allowed_networks": [str(net) for net in ip_restriction_manager.allowed_networks],
            "admin_only_networks": [str(net) for net in ip_restriction_manager.admin_only_networks]
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/ip-restrictions/block", summary="Block IP address")
async def block_ip(
    ip_data: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """Block an IP address"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_SYSTEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    ip_address = ip_data.get("ip_address")
    reason = ip_data.get("reason", "Manually blocked by admin")
    
    if not ip_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="IP address is required"
        )
    
    try:
        ip_restriction_manager.block_ip(ip_address, reason)
        
        return {
            "message": f"IP address {ip_address} blocked successfully",
            "ip_address": ip_address,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Failed to block IP {ip_address}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to block IP: {e}"
        )

# ============================================================================
# API KEY MANAGEMENT
# ============================================================================

@router.post("/api-keys/store", summary="Store encrypted API key")
async def store_api_key(
    key_data: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """Store an encrypted API key"""
    if not rbac_manager.check_permission(current_user.role, Permission.API_KEYS_MANAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    provider = key_data.get("provider")
    api_key = key_data.get("api_key")
    
    if not provider or not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider and API key are required"
        )
    
    # Validate API key format
    if not api_key_storage.validate_api_key_format(provider, api_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key format for provider"
        )
    
    try:
        storage_id = api_key_storage.store_api_key(str(current_user.id), provider, api_key)
        
        return {
            "message": "API key stored successfully",
            "storage_id": storage_id,
            "provider": provider,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Failed to store API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store API key"
        )

# ============================================================================
# AUDIT LOG ENDPOINTS
# ============================================================================

@router.get("/audit/events", summary="Get audit events")
async def get_audit_events(
    limit: int = 100,
    offset: int = 0,
    event_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get audit log events"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # In a real implementation, this would read from audit log files or database
    # For now, return a placeholder response
    
    return {
        "message": "Audit log endpoint - implementation depends on logging backend",
        "filters": {
            "limit": limit,
            "offset": offset,
            "event_type": event_type
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# RATE LIMITING CONFIGURATION
# ============================================================================

@router.get("/rate-limits", summary="Get rate limiting configuration")
async def get_rate_limits(current_user: User = Depends(get_current_user)):
    """Get current rate limiting configuration"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    config = RateLimitConfig()
    
    return {
        "rate_limits": {
            "default_per_minute": config.DEFAULT_REQUESTS_PER_MINUTE,
            "default_per_hour": config.DEFAULT_REQUESTS_PER_HOUR,
            "endpoint_limits": config.ENDPOINT_LIMITS,
            "role_limits": config.ROLE_LIMITS
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# SECURITY METRICS
# ============================================================================

@router.get("/metrics", summary="Get security metrics")
async def get_security_metrics(current_user: User = Depends(get_current_user)):
    """Get security-related metrics"""
    if not rbac_manager.check_permission(current_user.role, Permission.ADMIN_READ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # In a real implementation, these would come from monitoring systems
    metrics = {
        "authentication": {
            "total_login_attempts_24h": 0,  # Placeholder
            "failed_login_attempts_24h": 0,  # Placeholder
            "blocked_ips_count": len(ip_restriction_manager.blocked_ips)
        },
        "vulnerabilities": {
            "last_scan_time": None,  # Would come from scan reports
            "total_vulnerabilities": 0,  # Would come from scan reports
            "critical_vulnerabilities": 0  # Would come from scan reports
        },
        "security_features": {
            "encryption_enabled": settings.DATA_ENCRYPTION_ENABLED,
            "audit_logging_enabled": settings.AUDIT_LOGGING_ENABLED,
            "rate_limiting_enabled": settings.RATE_LIMIT_ENABLED,
            "owasp_protection_enabled": settings.OWASP_TOP10_PROTECTION
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    return metrics

# ============================================================================
# INCIDENT RESPONSE
# ============================================================================

@router.post("/incident/report", summary="Report security incident")
async def report_security_incident(
    incident_data: Dict[str, Any],
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Report a security incident"""
    incident_type = incident_data.get("type")
    description = incident_data.get("description")
    severity = incident_data.get("severity", "medium")
    
    if not incident_type or not description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incident type and description are required"
        )
    
    # Log security incident
    client_ip = request.client.host
    incident_log = {
        "timestamp": datetime.utcnow().isoformat(),
        "incident_id": f"SEC_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "type": incident_type,
        "description": description,
        "severity": severity,
        "reported_by": current_user.id,
        "client_ip": client_ip,
        "user_agent": request.headers.get("user-agent")
    }
    
    logger.warning(f"Security incident reported: {incident_log}")
    
    return {
        "message": "Security incident reported successfully",
        "incident_id": incident_log["incident_id"],
        "timestamp": incident_log["timestamp"]
    }

# ============================================================================
# HEALTH CHECK FOR SECURITY SYSTEMS
# ============================================================================

@router.get("/health", summary="Security systems health check")
async def security_health_check():
    """Check health of security systems"""
    health_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_status": "healthy",
        "systems": {}
    }
    
    # Test encryption
    try:
        test_data = "health_check_test"
        encrypted = data_encryption.encrypt(test_data)
        decrypted = data_encryption.decrypt(encrypted)
        health_status["systems"]["encryption"] = {
            "status": "healthy" if test_data == decrypted else "error",
            "message": "Encryption/decryption working"
        }
    except Exception as e:
        health_status["systems"]["encryption"] = {
            "status": "error",
            "message": f"Encryption test failed: {e}"
        }
        health_status["overall_status"] = "degraded"
    
    # Test JWT
    try:
        test_token = jwt_manager.create_access_token("health_check")
        payload = jwt_manager.verify_token(test_token)
        health_status["systems"]["jwt"] = {
            "status": "healthy",
            "message": "JWT creation/verification working"
        }
    except Exception as e:
        health_status["systems"]["jwt"] = {
            "status": "error",
            "message": f"JWT test failed: {e}"
        }
        health_status["overall_status"] = "degraded"
    
    # Test RBAC
    try:
        permissions = rbac_manager.get_user_permissions("user")
        health_status["systems"]["rbac"] = {
            "status": "healthy",
            "message": f"RBAC working, {len(permissions)} permissions for user role"
        }
    except Exception as e:
        health_status["systems"]["rbac"] = {
            "status": "error",
            "message": f"RBAC test failed: {e}"
        }
        health_status["overall_status"] = "degraded"
    
    return health_status 