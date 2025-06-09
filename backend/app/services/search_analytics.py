"""
Search Analytics Service

This module provides analytics tracking for search queries and results,
including performance metrics and search effectiveness measurements.
"""

import logging
import time
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import redis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

@dataclass
class SearchEvent:
    """Represents a search event for analytics."""
    user_id: str
    query: str
    timestamp: datetime
    results_count: int
    search_time_ms: float
    embedding_time_ms: float
    rerank_time_ms: Optional[float]
    reranking_enabled: bool
    top_score: float
    avg_score: float
    filters_used: Dict[str, Any]
    context_window_generated: bool

@dataclass
class ClickEvent:
    """Represents a result click event."""
    user_id: str
    query: str
    document_id: str
    result_position: int
    relevance_score: float
    timestamp: datetime

@dataclass
class SearchAnalytics:
    """Analytics summary for searches."""
    total_searches: int
    unique_users: int
    avg_search_time_ms: float
    avg_results_count: float
    avg_relevance_score: float
    top_queries: List[Dict[str, Any]]
    search_effectiveness: Dict[str, float]
    performance_metrics: Dict[str, float]

class SearchAnalyticsService:
    """Service for tracking and analyzing search behavior."""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """Initialize the search analytics service."""
        self.redis_client = redis_client or redis.Redis(
            host="localhost",
            port=6379,
            db=0,
            decode_responses=True
        )
        self.search_events_key = "search_analytics:events"
        self.click_events_key = "search_analytics:clicks"
        self.query_stats_key = "search_analytics:queries"
        
    def _get_time_window_key(self, window: str = "daily") -> str:
        """Get Redis key for time window."""
        today = datetime.now().strftime("%Y-%m-%d")
        if window == "daily":
            return f"{self.search_events_key}:{today}"
        elif window == "hourly":
            hour = datetime.now().strftime("%Y-%m-%d:%H")
            return f"{self.search_events_key}:{hour}"
        else:
            return self.search_events_key
    
    def track_search_event(self, search_event: SearchEvent):
        """Track a search event."""
        try:
            # Store in daily bucket
            daily_key = self._get_time_window_key("daily")
            hourly_key = self._get_time_window_key("hourly")
            
            event_data = asdict(search_event)
            event_data["timestamp"] = search_event.timestamp.isoformat()
            
            # Store event
            self.redis_client.lpush(daily_key, json.dumps(event_data))
            self.redis_client.lpush(hourly_key, json.dumps(event_data))
            
            # Set expiration (30 days for daily, 7 days for hourly)
            self.redis_client.expire(daily_key, 30 * 24 * 3600)
            self.redis_client.expire(hourly_key, 7 * 24 * 3600)
            
            # Update query frequency
            self.redis_client.zincrby(
                f"{self.query_stats_key}:frequency",
                1,
                search_event.query.lower()
            )
            
            # Update user search count
            self.redis_client.hincrby(
                f"{self.query_stats_key}:users",
                search_event.user_id,
                1
            )
            
            logger.debug(f"Tracked search event for user {search_event.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to track search event: {e}")
    
    def track_click_event(self, click_event: ClickEvent):
        """Track a result click event."""
        try:
            daily_key = f"{self.click_events_key}:{datetime.now().strftime('%Y-%m-%d')}"
            
            event_data = asdict(click_event)
            event_data["timestamp"] = click_event.timestamp.isoformat()
            
            self.redis_client.lpush(daily_key, json.dumps(event_data))
            self.redis_client.expire(daily_key, 30 * 24 * 3600)  # 30 days
            
            # Update click-through rate data
            query_key = f"{self.query_stats_key}:ctr:{click_event.query.lower()}"
            self.redis_client.hincrby(query_key, "clicks", 1)
            self.redis_client.expire(query_key, 30 * 24 * 3600)
            
            logger.debug(f"Tracked click event for user {click_event.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to track click event: {e}")
    
    def get_search_analytics(
        self,
        time_window: str = "daily",
        days_back: int = 7
    ) -> SearchAnalytics:
        """Get search analytics for a time period."""
        try:
            events = []
            
            # Collect events from multiple days
            for i in range(days_back):
                date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
                key = f"{self.search_events_key}:{date}"
                
                raw_events = self.redis_client.lrange(key, 0, -1)
                for raw_event in raw_events:
                    try:
                        event_data = json.loads(raw_event)
                        events.append(event_data)
                    except json.JSONDecodeError:
                        continue
            
            if not events:
                return SearchAnalytics(
                    total_searches=0,
                    unique_users=0,
                    avg_search_time_ms=0.0,
                    avg_results_count=0.0,
                    avg_relevance_score=0.0,
                    top_queries=[],
                    search_effectiveness={},
                    performance_metrics={}
                )
            
            # Calculate metrics
            total_searches = len(events)
            unique_users = len(set(event["user_id"] for event in events))
            
            search_times = [event["search_time_ms"] for event in events]
            avg_search_time = sum(search_times) / len(search_times)
            
            results_counts = [event["results_count"] for event in events]
            avg_results_count = sum(results_counts) / len(results_counts)
            
            relevance_scores = [event["avg_score"] for event in events]
            avg_relevance_score = sum(relevance_scores) / len(relevance_scores)
            
            # Top queries
            query_freq = self.redis_client.zrevrange(
                f"{self.query_stats_key}:frequency",
                0, 9, withscores=True
            )
            top_queries = [
                {"query": query, "count": int(count)}
                for query, count in query_freq
            ]
            
            # Search effectiveness metrics
            reranked_events = [e for e in events if e.get("reranking_enabled")]
            rerank_improvement = 0.0
            if reranked_events:
                # Calculate average score improvement from reranking
                # This is a simplified metric
                rerank_scores = [e["avg_score"] for e in reranked_events]
                non_rerank_scores = [e["avg_score"] for e in events if not e.get("reranking_enabled")]
                if non_rerank_scores:
                    rerank_improvement = (
                        sum(rerank_scores) / len(rerank_scores) - 
                        sum(non_rerank_scores) / len(non_rerank_scores)
                    )
            
            search_effectiveness = {
                "rerank_usage_rate": len(reranked_events) / total_searches,
                "avg_rerank_improvement": rerank_improvement,
                "high_relevance_rate": len([e for e in events if e["top_score"] > 0.8]) / total_searches,
                "zero_results_rate": len([e for e in events if e["results_count"] == 0]) / total_searches
            }
            
            # Performance metrics
            embedding_times = [event["embedding_time_ms"] for event in events]
            rerank_times = [event["rerank_time_ms"] for event in events if event.get("rerank_time_ms")]
            
            performance_metrics = {
                "avg_embedding_time_ms": sum(embedding_times) / len(embedding_times),
                "avg_rerank_time_ms": sum(rerank_times) / len(rerank_times) if rerank_times else 0.0,
                "p95_search_time_ms": sorted(search_times)[int(0.95 * len(search_times))] if search_times else 0.0,
                "searches_per_user": total_searches / unique_users if unique_users > 0 else 0.0
            }
            
            return SearchAnalytics(
                total_searches=total_searches,
                unique_users=unique_users,
                avg_search_time_ms=avg_search_time,
                avg_results_count=avg_results_count,
                avg_relevance_score=avg_relevance_score,
                top_queries=top_queries,
                search_effectiveness=search_effectiveness,
                performance_metrics=performance_metrics
            )
            
        except Exception as e:
            logger.error(f"Failed to get search analytics: {e}")
            return SearchAnalytics(
                total_searches=0,
                unique_users=0,
                avg_search_time_ms=0.0,
                avg_results_count=0.0,
                avg_relevance_score=0.0,
                top_queries=[],
                search_effectiveness={},
                performance_metrics={}
            )
    
    def get_user_search_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get search history for a specific user."""
        try:
            user_events = []
            
            # Search through recent events
            for i in range(7):  # Last 7 days
                date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
                key = f"{self.search_events_key}:{date}"
                
                raw_events = self.redis_client.lrange(key, 0, -1)
                for raw_event in raw_events:
                    try:
                        event_data = json.loads(raw_event)
                        if event_data["user_id"] == user_id:
                            user_events.append(event_data)
                    except json.JSONDecodeError:
                        continue
            
            # Sort by timestamp and limit
            user_events.sort(key=lambda x: x["timestamp"], reverse=True)
            return user_events[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get user search history: {e}")
            return []
    
    def get_popular_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most popular search queries."""
        try:
            query_freq = self.redis_client.zrevrange(
                f"{self.query_stats_key}:frequency",
                0, limit - 1, withscores=True
            )
            return [
                {"query": query, "search_count": int(count)}
                for query, count in query_freq
            ]
        except Exception as e:
            logger.error(f"Failed to get popular queries: {e}")
            return []
    
    def clear_analytics(self, older_than_days: int = 30):
        """Clear old analytics data."""
        try:
            cutoff_date = datetime.now() - timedelta(days=older_than_days)
            
            # Get all keys to check
            pattern = f"{self.search_events_key}:*"
            keys = self.redis_client.keys(pattern)
            
            deleted_count = 0
            for key in keys:
                # Extract date from key
                try:
                    date_str = key.split(":")[-1]
                    key_date = datetime.strptime(date_str, "%Y-%m-%d")
                    if key_date < cutoff_date:
                        self.redis_client.delete(key)
                        deleted_count += 1
                except ValueError:
                    # Not a date-based key, skip
                    continue
            
            logger.info(f"Cleared {deleted_count} old analytics keys")
            
        except Exception as e:
            logger.error(f"Failed to clear analytics: {e}")
    
    def get_real_time_stats(self) -> Dict[str, Any]:
        """Get real-time search statistics."""
        try:
            # Current hour stats
            current_hour_key = self._get_time_window_key("hourly")
            hourly_count = self.redis_client.llen(current_hour_key)
            
            # Active users (last hour)
            hourly_events = self.redis_client.lrange(current_hour_key, 0, -1)
            active_users = set()
            for raw_event in hourly_events:
                try:
                    event_data = json.loads(raw_event)
                    active_users.add(event_data["user_id"])
                except json.JSONDecodeError:
                    continue
            
            # Recent search performance
            recent_events = hourly_events[-10:]  # Last 10 searches
            recent_times = []
            for raw_event in recent_events:
                try:
                    event_data = json.loads(raw_event)
                    total_time = (
                        event_data["search_time_ms"] + 
                        event_data["embedding_time_ms"] + 
                        (event_data.get("rerank_time_ms") or 0)
                    )
                    recent_times.append(total_time)
                except (json.JSONDecodeError, KeyError):
                    continue
            
            avg_recent_time = sum(recent_times) / len(recent_times) if recent_times else 0.0
            
            return {
                "searches_this_hour": hourly_count,
                "active_users_this_hour": len(active_users),
                "avg_response_time_ms": avg_recent_time,
                "system_status": "healthy" if avg_recent_time < 2000 else "degraded"
            }
            
        except Exception as e:
            logger.error(f"Failed to get real-time stats: {e}")
            return {
                "searches_this_hour": 0,
                "active_users_this_hour": 0,
                "avg_response_time_ms": 0.0,
                "system_status": "unknown"
            } 