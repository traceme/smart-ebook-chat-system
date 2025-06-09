"""
Locust performance tests for SECS API endpoints.

Run with: locust -f tests/performance/locustfile.py --host=http://localhost:8000
"""

import json
import random
import uuid
from datetime import datetime
from typing import Dict, Any

from locust import HttpUser, task, between, events
from locust.exception import RescheduleTask


class SECSUser(HttpUser):
    """Simulates a user interacting with the SECS system."""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def on_start(self):
        """Setup method called when a simulated user starts."""
        self.auth_token = None
        self.user_id = None
        self.document_ids = []
        
        # Register and login
        self.register_user()
        self.login_user()
    
    def register_user(self):
        """Register a new user."""
        user_data = {
            "email": f"loadtest_{uuid.uuid4().hex[:8]}@example.com",
            "password": "LoadTest123!",
            "full_name": f"Load Test User {random.randint(1, 10000)}"
        }
        
        response = self.client.post("/auth/register", json=user_data)
        if response.status_code == 201:
            self.user_data = user_data
        else:
            # If registration fails, use existing test user
            self.user_data = {
                "email": "loadtest@example.com",
                "password": "LoadTest123!"
            }
    
    def login_user(self):
        """Login user and get auth token."""
        login_data = {
            "username": self.user_data["email"],
            "password": self.user_data["password"]
        }
        
        response = self.client.post("/auth/login", data=login_data)
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.headers = {"Authorization": f"Bearer {self.auth_token}"}
        else:
            raise RescheduleTask("Failed to login")
    
    @task(3)
    def get_user_profile(self):
        """Get current user profile."""
        if not self.auth_token:
            return
        
        self.client.get("/auth/me", headers=self.headers, name="/auth/me")
    
    @task(5)
    def list_documents(self):
        """List user documents."""
        if not self.auth_token:
            return
        
        params = {
            "skip": random.randint(0, 20),
            "limit": random.randint(10, 50)
        }
        
        self.client.get(
            "/documents/", 
            headers=self.headers, 
            params=params,
            name="/documents/"
        )
    
    @task(2)
    def upload_document(self):
        """Simulate document upload."""
        if not self.auth_token:
            return
        
        # Simulate file upload
        files = {
            "file": (
                f"test_document_{random.randint(1, 1000)}.txt",
                f"This is test content for performance testing. Document ID: {uuid.uuid4()}",
                "text/plain"
            )
        }
        
        response = self.client.post(
            "/documents/upload",
            headers=self.headers,
            files=files,
            name="/documents/upload"
        )
        
        if response.status_code == 201:
            document_data = response.json()
            self.document_ids.append(document_data["id"])
    
    @task(4)
    def search_documents(self):
        """Perform vector search."""
        if not self.auth_token:
            return
        
        search_queries = [
            "machine learning algorithms",
            "data science techniques",
            "artificial intelligence",
            "deep learning models",
            "natural language processing",
            "computer vision applications",
            "neural network architectures",
            "data analysis methods"
        ]
        
        search_data = {
            "query": random.choice(search_queries),
            "limit": random.randint(5, 20),
            "min_score": random.uniform(0.5, 0.8)
        }
        
        self.client.post(
            "/vector-search/search",
            headers=self.headers,
            json=search_data,
            name="/vector-search/search"
        )
    
    @task(1)
    def get_document_details(self):
        """Get details of a specific document."""
        if not self.auth_token or not self.document_ids:
            return
        
        document_id = random.choice(self.document_ids)
        self.client.get(
            f"/documents/{document_id}",
            headers=self.headers,
            name="/documents/{id}"
        )
    
    @task(2)
    def get_processing_status(self):
        """Check processing status."""
        if not self.auth_token or not self.document_ids:
            return
        
        document_id = random.choice(self.document_ids)
        self.client.get(
            f"/processing-status/{document_id}",
            headers=self.headers,
            name="/processing-status/{id}"
        )
    
    @task(1)
    def chat_with_documents(self):
        """Simulate chat functionality."""
        if not self.auth_token:
            return
        
        chat_messages = [
            "What are the main topics in my documents?",
            "Can you summarize the key findings?",
            "What are the most important concepts?",
            "How do these documents relate to each other?",
            "What conclusions can be drawn from this content?"
        ]
        
        chat_data = {
            "message": random.choice(chat_messages),
            "document_ids": self.document_ids[:3] if len(self.document_ids) > 3 else self.document_ids,
            "model": "gpt-4",
            "temperature": 0.7
        }
        
        self.client.post(
            "/chat/",
            headers=self.headers,
            json=chat_data,
            name="/chat/"
        )


class AdminUser(HttpUser):
    """Simulates admin user performing administrative tasks."""
    
    wait_time = between(2, 5)
    weight = 1  # Fewer admin users
    
    def on_start(self):
        """Setup admin user."""
        self.login_admin()
    
    def login_admin(self):
        """Login as admin user."""
        login_data = {
            "username": "admin@example.com",
            "password": "AdminPass123!"
        }
        
        response = self.client.post("/auth/login", data=login_data)
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.headers = {"Authorization": f"Bearer {self.auth_token}"}
        else:
            raise RescheduleTask("Failed to login as admin")
    
    @task(2)
    def get_system_stats(self):
        """Get system statistics."""
        if not self.auth_token:
            return
        
        self.client.get(
            "/admin/stats",
            headers=self.headers,
            name="/admin/stats"
        )
    
    @task(1)
    def list_all_users(self):
        """List all users (admin only)."""
        if not self.auth_token:
            return
        
        params = {
            "skip": 0,
            "limit": 100
        }
        
        self.client.get(
            "/admin/users",
            headers=self.headers,
            params=params,
            name="/admin/users"
        )
    
    @task(1)
    def get_processing_queue_status(self):
        """Check processing queue status."""
        if not self.auth_token:
            return
        
        self.client.get(
            "/admin/processing-queue",
            headers=self.headers,
            name="/admin/processing-queue"
        )


class DatabaseStressUser(HttpUser):
    """Simulates heavy database operations."""
    
    wait_time = between(0.5, 1.5)
    weight = 2  # More database stress users
    
    def on_start(self):
        """Setup database stress user."""
        self.auth_token = None
        self.login_user()
    
    def login_user(self):
        """Quick login for stress testing."""
        login_data = {
            "username": "stresstest@example.com",
            "password": "StressTest123!"
        }
        
        response = self.client.post("/auth/login", data=login_data)
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.headers = {"Authorization": f"Bearer {self.auth_token}"}
    
    @task(10)
    def rapid_document_queries(self):
        """Perform rapid document queries."""
        if not self.auth_token:
            return
        
        params = {
            "skip": random.randint(0, 100),
            "limit": random.randint(1, 10)
        }
        
        self.client.get(
            "/documents/",
            headers=self.headers,
            params=params,
            name="/documents/ (stress)"
        )
    
    @task(5)
    def concurrent_searches(self):
        """Perform concurrent search operations."""
        if not self.auth_token:
            return
        
        search_data = {
            "query": f"stress test query {random.randint(1, 1000)}",
            "limit": 5
        }
        
        self.client.post(
            "/vector-search/search",
            headers=self.headers,
            json=search_data,
            name="/vector-search/search (stress)"
        )


# Performance test events and metrics
@events.init_command_line_parser.add_listener
def _(parser):
    """Add custom command line arguments."""
    parser.add_argument("--test-scenario", type=str, default="normal", 
                       help="Test scenario: normal, stress, peak")


@events.test_start.add_listener
def _(environment, **kwargs):
    """Log test start."""
    print(f"Starting SECS performance test at {datetime.now()}")
    print(f"Target host: {environment.host}")


@events.test_stop.add_listener
def _(environment, **kwargs):
    """Log test completion and results summary."""
    print(f"SECS performance test completed at {datetime.now()}")
    
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"95th percentile response time: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"Requests per second: {stats.total.current_rps:.2f}")


# Custom user classes for specific scenarios
class PeakLoadUser(SECSUser):
    """User for peak load testing."""
    wait_time = between(0.1, 0.5)  # Very aggressive
    weight = 10


class LightUser(SECSUser):
    """User for light load testing."""
    wait_time = between(5, 10)  # More relaxed
    weight = 1


# Task sets for specific functionality testing
from locust import TaskSet

class DocumentProcessingTaskSet(TaskSet):
    """Focused testing of document processing pipeline."""
    
    @task(1)
    def upload_and_track(self):
        """Upload document and track processing."""
        # Upload
        files = {
            "file": ("test.pdf", b"PDF content", "application/pdf")
        }
        
        response = self.client.post(
            "/documents/upload",
            headers=self.user.headers,
            files=files
        )
        
        if response.status_code == 201:
            document_id = response.json()["id"]
            
            # Track processing
            for _ in range(5):  # Check status 5 times
                self.client.get(
                    f"/processing-status/{document_id}",
                    headers=self.user.headers
                )
                self.wait()


class SearchTaskSet(TaskSet):
    """Focused testing of search functionality."""
    
    @task(1)
    def comprehensive_search(self):
        """Perform comprehensive search operations."""
        search_types = ["semantic", "keyword", "hybrid"]
        
        for search_type in search_types:
            search_data = {
                "query": f"test query for {search_type}",
                "search_type": search_type,
                "limit": 10
            }
            
            self.client.post(
                "/vector-search/search",
                headers=self.user.headers,
                json=search_data
            )


# Configuration for different test scenarios
class TestScenarios:
    """Test scenario configurations."""
    
    NORMAL_LOAD = {
        "users": 50,
        "spawn_rate": 5,
        "duration": "5m"
    }
    
    STRESS_TEST = {
        "users": 200,
        "spawn_rate": 20,
        "duration": "10m"
    }
    
    PEAK_LOAD = {
        "users": 500,
        "spawn_rate": 50,
        "duration": "15m"
    }
    
    ENDURANCE = {
        "users": 100,
        "spawn_rate": 10,
        "duration": "60m"
    } 