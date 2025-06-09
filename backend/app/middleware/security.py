import time
import json
import hashlib
import ipaddress
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from collections import defaultdict, deque
import logging

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import redis.asyncio as redis

from app.core.config import settings
from app.core.security import ip_restriction_manager, SecurityError, RateLimitError

logger = logging.getLogger(__name__)

# ============================================================================
# RATE LIMITING MIDDLEWARE
# ============================================================================

class RateLimitConfig:
    """Rate limiting configuration"""
    DEFAULT_REQUESTS_PER_MINUTE = 60
    DEFAULT_REQUESTS_PER_HOUR = 1000
    DEFAULT_REQUESTS_PER_DAY = 10000
    
    # Endpoint-specific limits
    ENDPOINT_LIMITS = {
        "/api/v1/auth/login": {"requests": 5, "window": 300},  # 5 per 5 minutes
        "/api/v1/auth/register": {"requests": 3, "window": 3600},  # 3 per hour
        "/api/v1/documents/upload": {"requests": 20, "window": 3600},  # 20 per hour
        "/api/v1/chat": {"requests": 100, "window": 3600},  # 100 per hour
        "/api/v1/vector-search": {"requests": 200, "window": 3600},  # 200 per hour
    }
    
    # Role-based limits
    ROLE_LIMITS = {
        "guest": {"requests": 10, "window": 3600},
        "user": {"requests": 100, "window": 3600},
        "premium": {"requests": 500, "window": 3600},
        "admin": {"requests": 10000, "window": 3600},
    }

class InMemoryRateLimiter:
    """In-memory rate limiter using sliding window"""
    
    def __init__(self):
        self.requests: Dict[str, deque] = defaultdict(deque)
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
    
    def is_allowed(self, key: str, limit: int, window: int) -> tuple[bool, Dict[str, Any]]:
        """Check if request is allowed"""
        now = time.time()
        
        # Cleanup old entries periodically
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries()
            self.last_cleanup = now
        
        # Get request times for this key
        request_times = self.requests[key]
        
        # Remove expired requests
        cutoff = now - window
        while request_times and request_times[0] < cutoff:
            request_times.popleft()
        
        # Check if limit exceeded
        current_count = len(request_times)
        if current_count >= limit:
            # Calculate retry after
            oldest_request = request_times[0] if request_times else now
            retry_after = int(oldest_request + window - now)
            
            return False, {
                "current": current_count,
                "limit": limit,
                "window": window,
                "retry_after": max(retry_after, 1)
            }
        
        # Add current request
        request_times.append(now)
        
        return True, {
            "current": current_count + 1,
            "limit": limit,
            "window": window,
            "remaining": limit - current_count - 1
        }
    
    def _cleanup_old_entries(self):
        """Clean up old entries to prevent memory leaks"""
        now = time.time()
        keys_to_remove = []
        
        for key, times in self.requests.items():
            # Remove entries older than 24 hours
            while times and times[0] < now - 86400:
                times.popleft()
            
            # Remove empty deques
            if not times:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.requests[key]

class RedisRateLimiter:
    """Redis-based rate limiter for distributed systems"""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis = None
    
    async def _get_redis(self):
        """Get Redis connection"""
        if self._redis is None:
            self._redis = redis.from_url(self.redis_url)
        return self._redis
    
    async def is_allowed(self, key: str, limit: int, window: int) -> tuple[bool, Dict[str, Any]]:
        """Check if request is allowed using Redis sliding window"""
        redis_client = await self._get_redis()
        now = time.time()
        pipeline = redis_client.pipeline()
        
        # Remove expired entries
        pipeline.zremrangebyscore(key, 0, now - window)
        
        # Count current requests
        pipeline.zcard(key)
        
        # Add current request
        pipeline.zadd(key, {str(now): now})
        
        # Set expiration
        pipeline.expire(key, window)
        
        results = await pipeline.execute()
        current_count = results[1]
        
        if current_count >= limit:
            # Get oldest request for retry calculation
            oldest_requests = await redis_client.zrange(key, 0, 0, withscores=True)
            oldest_time = oldest_requests[0][1] if oldest_requests else now
            retry_after = int(oldest_time + window - now)
            
            return False, {
                "current": current_count,
                "limit": limit,
                "window": window,
                "retry_after": max(retry_after, 1)
            }
        
        return True, {
            "current": current_count + 1,
            "limit": limit,
            "window": window,
            "remaining": limit - current_count - 1
        }

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app: ASGIApp, redis_url: str = None):
        super().__init__(app)
        if redis_url:
            self.limiter = RedisRateLimiter(redis_url)
        else:
            self.limiter = InMemoryRateLimiter()
        self.config = RateLimitConfig()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting"""
        try:
            # Skip rate limiting for health checks
            if request.url.path in ["/health", "/", "/docs", "/redoc"]:
                return await call_next(request)
            
            # Get client identifier
            client_ip = self._get_client_ip(request)
            user_id = getattr(request.state, "user_id", None)
            user_role = getattr(request.state, "user_role", "guest")
            
            # Determine rate limit
            limit_info = self._get_rate_limit(request.url.path, user_role)
            
            # Create rate limit key
            key = f"rate_limit:{client_ip}:{user_id or 'anonymous'}:{request.url.path}"
            
            # Check rate limit
            if hasattr(self.limiter, 'is_allowed'):
                # Synchronous limiter
                allowed, info = self.limiter.is_allowed(key, limit_info["requests"], limit_info["window"])
            else:
                # Asynchronous limiter
                allowed, info = await self.limiter.is_allowed(key, limit_info["requests"], limit_info["window"])
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Try again in {info['retry_after']} seconds.",
                        "retry_after": info["retry_after"]
                    },
                    headers={
                        "Retry-After": str(info["retry_after"]),
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(time.time() + info["retry_after"]))
                    }
                )
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(info.get("remaining", 0))
            response.headers["X-RateLimit-Reset"] = str(int(time.time() + limit_info["window"]))
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Continue without rate limiting if there's an error
            return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check forwarded headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _get_rate_limit(self, path: str, user_role: str) -> Dict[str, int]:
        """Get rate limit for path and user role"""
        # Check endpoint-specific limits
        for endpoint, limit in self.config.ENDPOINT_LIMITS.items():
            if path.startswith(endpoint):
                return limit
        
        # Check role-based limits
        role_limit = self.config.ROLE_LIMITS.get(user_role)
        if role_limit:
            return role_limit
        
        # Default limit
        return {"requests": self.config.DEFAULT_REQUESTS_PER_MINUTE, "window": 60}

# ============================================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Security headers middleware"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.security_headers = {
            # Prevent XSS attacks
            "X-XSS-Protection": "1; mode=block",
            
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none';"
            ),
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Permissions policy
            "Permissions-Policy": (
                "geolocation=(), "
                "microphone=(), "
                "camera=(), "
                "payment=(), "
                "usb=(), "
                "magnetometer=(), "
                "gyroscope=(), "
                "speaker=()"
            ),
            
            # Server information hiding
            "Server": "SmartEbookChat/1.0"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response"""
        response = await call_next(request)
        
        # Add security headers
        for header, value in self.security_headers.items():
            response.headers[header] = value
        
        # Remove server information
        if "server" in response.headers:
            del response.headers["server"]
        
        return response

# ============================================================================
# REQUEST VALIDATION MIDDLEWARE
# ============================================================================

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Request validation and sanitization middleware"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.max_request_size = 100 * 1024 * 1024  # 100MB
        self.blocked_user_agents = [
            "sqlmap", "nikto", "nmap", "masscan", "nessus", "openvas",
            "w3af", "skipfish", "arachni", "zap", "burp", "webscarab"
        ]
        self.suspicious_patterns = [
            r"(?i)(\bunion\b.*\bselect\b)",
            r"(?i)(\bselect\b.*\bfrom\b)",
            r"(?i)(\binsert\b.*\binto\b)",
            r"(?i)(\bdelete\b.*\bfrom\b)",
            r"(?i)(\bdrop\b.*\btable\b)",
            r"(?i)(<script[^>]*>.*?</script>)",
            r"(?i)(javascript:)",
            r"(?i)(vbscript:)",
            r"(?i)(onload\s*=)",
            r"(?i)(onerror\s*=)",
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Validate and sanitize requests"""
        try:
            # Check request size
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_request_size:
                logger.warning(f"Request too large: {content_length} bytes from {self._get_client_ip(request)}")
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"error": "Request too large"}
                )
            
            # Check user agent
            user_agent = request.headers.get("user-agent", "").lower()
            if any(blocked in user_agent for blocked in self.blocked_user_agents):
                logger.warning(f"Blocked user agent: {user_agent} from {self._get_client_ip(request)}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"error": "Forbidden"}
                )
            
            # Check IP restrictions
            client_ip = self._get_client_ip(request)
            if ip_restriction_manager.is_ip_blocked(client_ip):
                logger.warning(f"Blocked IP access: {client_ip}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"error": "Access denied"}
                )
            
            # Validate query parameters and headers for suspicious content
            self._validate_request_content(request)
            
            return await call_next(request)
            
        except SecurityError as e:
            logger.warning(f"Security validation failed: {e}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "Invalid request"}
            )
        except Exception as e:
            logger.error(f"Request validation error: {e}")
            return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _validate_request_content(self, request: Request):
        """Validate request content for suspicious patterns"""
        import re
        
        # Check query parameters
        query_string = str(request.url.query)
        for pattern in self.suspicious_patterns:
            if re.search(pattern, query_string):
                raise SecurityError(f"Suspicious pattern detected in query: {pattern}")
        
        # Check headers
        for header_name, header_value in request.headers.items():
            for pattern in self.suspicious_patterns:
                if re.search(pattern, header_value):
                    raise SecurityError(f"Suspicious pattern detected in header {header_name}")

# ============================================================================
# AUDIT LOGGING MIDDLEWARE
# ============================================================================

class AuditLogMiddleware(BaseHTTPMiddleware):
    """Audit logging middleware for security events"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.audit_logger = logging.getLogger("audit")
        self.sensitive_endpoints = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/logout",
            "/api/v1/users/",
            "/api/v1/admin/",
            "/api/v1/api-keys/",
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Log security-relevant events"""
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        user_id = getattr(request.state, "user_id", None)
        user_role = getattr(request.state, "user_role", "anonymous")
        
        # Process request
        response = await call_next(request)
        
        # Log security-relevant events
        duration = time.time() - start_time
        
        # Always log authentication attempts
        if any(endpoint in request.url.path for endpoint in self.sensitive_endpoints):
            self._log_security_event(
                event_type="access_attempt",
                client_ip=client_ip,
                user_id=user_id,
                user_role=user_role,
                path=request.url.path,
                method=request.method,
                status_code=response.status_code,
                duration=duration,
                user_agent=request.headers.get("user-agent", "")
            )
        
        # Log failed requests
        if response.status_code >= 400:
            self._log_security_event(
                event_type="failed_request",
                client_ip=client_ip,
                user_id=user_id,
                user_role=user_role,
                path=request.url.path,
                method=request.method,
                status_code=response.status_code,
                duration=duration,
                user_agent=request.headers.get("user-agent", "")
            )
        
        # Log slow requests (potential DoS)
        if duration > 10:  # 10 seconds
            self._log_security_event(
                event_type="slow_request",
                client_ip=client_ip,
                user_id=user_id,
                user_role=user_role,
                path=request.url.path,
                method=request.method,
                status_code=response.status_code,
                duration=duration,
                user_agent=request.headers.get("user-agent", "")
            )
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _log_security_event(self, event_type: str, **kwargs):
        """Log security event"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            **kwargs
        }
        
        self.audit_logger.info(json.dumps(event))

# ============================================================================
# DDOS PROTECTION MIDDLEWARE
# ============================================================================

class DDoSProtectionMiddleware(BaseHTTPMiddleware):
    """Basic DDoS protection middleware"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.connection_counts = defaultdict(int)
        self.max_connections_per_ip = 50
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Basic DDoS protection"""
        client_ip = self._get_client_ip(request)
        
        # Cleanup old connections periodically
        now = time.time()
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup_connections()
            self.last_cleanup = now
        
        # Check connection count
        self.connection_counts[client_ip] += 1
        
        if self.connection_counts[client_ip] > self.max_connections_per_ip:
            logger.warning(f"DDoS protection triggered for IP: {client_ip}")
            # Block IP temporarily
            ip_restriction_manager.block_ip(client_ip, "DDoS protection")
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"error": "Too many connections"}
            )
        
        try:
            response = await call_next(request)
            return response
        finally:
            # Decrement connection count
            self.connection_counts[client_ip] = max(0, self.connection_counts[client_ip] - 1)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _cleanup_connections(self):
        """Clean up connection counts"""
        # Reset all counts (simple approach)
        # In production, use more sophisticated tracking
        self.connection_counts.clear()

# ============================================================================
# TLS/SSL ENFORCEMENT MIDDLEWARE
# ============================================================================

class TLSEnforcementMiddleware(BaseHTTPMiddleware):
    """TLS/SSL enforcement middleware"""
    
    def __init__(self, app: ASGIApp, enforce_https: bool = True):
        super().__init__(app)
        self.enforce_https = enforce_https
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Enforce HTTPS"""
        if self.enforce_https:
            # Check if request is using HTTPS
            scheme = request.url.scheme
            forwarded_proto = request.headers.get("X-Forwarded-Proto")
            
            is_https = (
                scheme == "https" or 
                forwarded_proto == "https" or
                request.headers.get("X-Forwarded-SSL") == "on"
            )
            
            if not is_https and request.url.hostname not in ["localhost", "127.0.0.1"]:
                # Redirect to HTTPS
                https_url = request.url.replace(scheme="https")
                return JSONResponse(
                    status_code=status.HTTP_301_MOVED_PERMANENTLY,
                    headers={"Location": str(https_url)},
                    content={"message": "HTTPS required"}
                )
        
        return await call_next(request) 