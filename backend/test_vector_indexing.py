#!/usr/bin/env python3
"""
Comprehensive test script for the vector indexing system.

This script tests the complete pipeline:
1. User authentication
2. Document upload
3. Document conversion
4. Vector indexing
5. Semantic search
"""

import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"

class VectorIndexingTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.document_id = None

    def authenticate(self, email: str = "test@example.com", password: str = "testpassword123") -> bool:
        """Authenticate and get access token."""
        print("🔐 Authenticating user...")
        
        # First try to register the user
        register_data = {
            "email": email,
            "password": password
        }
        
        response = self.session.post(f"{BASE_URL}/users/", json=register_data)
        if response.status_code == 400:
            print("   User already exists, proceeding to login...")
        elif response.status_code == 200:
            print("   User registered successfully!")
        else:
            print(f"   Registration failed: {response.status_code} - {response.text}")

        # Login to get token
        login_data = {"username": email, "password": password}
        response = self.session.post(
            f"{BASE_URL}/login/access-token", 
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print("   ✅ Authentication successful!")
            return True
        else:
            print(f"   ❌ Login failed: {response.status_code} - {response.text}")
            return False

    def check_vector_health(self) -> bool:
        """Check vector search service health."""
        print("🏥 Checking vector search health...")
        
        response = self.session.get(f"{BASE_URL}/vector/health")
        if response.status_code == 200:
            data = response.json()
            if data["status"] == "healthy":
                print("   ✅ Vector search service is healthy!")
                print(f"   📊 Collection info: {data['services']['collection_info']}")
                return True
            else:
                print(f"   ⚠️ Vector search service is unhealthy: {data}")
                return False
        else:
            print(f"   ❌ Health check failed: {response.status_code} - {response.text}")
            return False

    def create_test_document(self) -> bool:
        """Create a test document for indexing."""
        print("📄 Creating test document...")
        
        # Add timestamp to make content unique
        timestamp = int(time.time())
        
        # Create a test markdown document
        test_content = f"""# Test Document for Vector Indexing (Test {timestamp})

This is a comprehensive test document designed to evaluate the vector indexing system of the Smart eBook Chat System.
Generated at timestamp: {timestamp}

## Introduction

Vector indexing is a crucial component of modern information retrieval systems. It enables semantic search capabilities that go beyond simple keyword matching.

## Key Concepts

### Embeddings
Embeddings are dense vector representations of text that capture semantic meaning. The text-embedding-3 model from OpenAI provides high-quality embeddings for various text types.

### Vector Similarity
Vector similarity measures how semantically similar two pieces of text are by calculating the distance between their embedding vectors in high-dimensional space.

## Implementation Details

The system implements the following workflow:
1. Document chunking with optimal token limits
2. Embedding generation using OpenAI's API
3. Vector storage in Qdrant database
4. Similarity search with metadata filtering

## Search Capabilities

Users can perform semantic searches that understand context and meaning, not just exact keyword matches. This enables more intuitive and powerful document discovery.

## Conclusion

This vector indexing implementation provides a solid foundation for semantic search in the eBook chat system.
Test execution timestamp: {timestamp}
"""

        # Save test content to upload
        import tempfile
        import os
        
        unique_filename = f"test_vector_document_{timestamp}.md"
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write(test_content)
            test_file_path = f.name

        try:
            # Calculate file hash for deduplication
            import hashlib
            with open(test_file_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()

            # Initialize upload
            file_size = os.path.getsize(test_file_path)
            init_data = {
                "filename": unique_filename,
                "file_size": file_size,
                "file_hash": file_hash,
                "file_type": "txt"
            }

            response = self.session.post(f"{BASE_URL}/documents/upload/init", json=init_data)
            
            if response.status_code == 200:
                upload_info = response.json()
                self.document_id = upload_info["document_id"]
                print(f"   ✅ Document initialized: {self.document_id}")
                
                # Mark as completed (simulate upload)
                complete_response = self.session.post(
                    f"{BASE_URL}/documents/{self.document_id}/complete"
                )
                
                if complete_response.status_code == 200:
                    print("   ✅ Document upload completed!")
                    return True
                else:
                    print(f"   ❌ Failed to complete upload: {complete_response.status_code}")
                    return False
            else:
                print(f"   ❌ Failed to initialize document: {response.status_code} - {response.text}")
                return False
                
        finally:
            # Clean up temp file
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)

    def trigger_conversion(self) -> bool:
        """Trigger document conversion to markdown."""
        print("🔄 Triggering document conversion...")
        
        response = self.session.post(f"{BASE_URL}/documents/{self.document_id}/convert")
        
        if response.status_code == 200:
            data = response.json()
            task_id = data["task_id"]
            print(f"   ✅ Conversion started with task ID: {task_id}")
            
            # Wait for conversion to complete
            print("   ⏳ Waiting for conversion to complete...")
            for i in range(30):  # Wait up to 30 seconds
                time.sleep(1)
                status_response = self.session.get(
                    f"{BASE_URL}/documents/{self.document_id}/conversion-status"
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    if status_data.get("content_extracted"):
                        print("   ✅ Document conversion completed!")
                        return True
                    elif status_data.get("upload_status") == "conversion_failed":
                        print("   ❌ Document conversion failed!")
                        return False
                        
            print("   ⏰ Conversion timeout - may still be processing")
            return False
        else:
            print(f"   ❌ Failed to trigger conversion: {response.status_code} - {response.text}")
            return False

    def trigger_indexing(self) -> bool:
        """Trigger vector indexing for the document."""
        print("🎯 Triggering vector indexing...")
        
        response = self.session.post(f"{BASE_URL}/vector/documents/{self.document_id}/index")
        
        if response.status_code == 200:
            data = response.json()
            task_id = data["task_id"]
            print(f"   ✅ Indexing started with task ID: {task_id}")
            
            # Wait for indexing to complete
            print("   ⏳ Waiting for indexing to complete...")
            for i in range(60):  # Wait up to 60 seconds
                time.sleep(1)
                status_response = self.session.get(
                    f"{BASE_URL}/vector/documents/{self.document_id}/indexing-status"
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"   📊 Status: {status_data.get('upload_status')} | Indexed: {status_data.get('vector_indexed')}")
                    
                    if status_data.get("vector_indexed"):
                        print("   ✅ Document indexing completed!")
                        print(f"   📈 Chunks: {status_data.get('chunks_count')} | Vectors: {status_data.get('vectors_count')}")
                        return True
                    elif status_data.get("upload_status") == "indexing_failed":
                        print("   ❌ Document indexing failed!")
                        print(f"   🔍 Error: {status_data.get('error_message')}")
                        return False
                        
            print("   ⏰ Indexing timeout - may still be processing")
            return False
        else:
            print(f"   ❌ Failed to trigger indexing: {response.status_code} - {response.text}")
            return False

    def test_semantic_search(self) -> bool:
        """Test semantic search functionality."""
        print("🔍 Testing semantic search...")
        
        # Test various search queries
        test_queries = [
            "What is vector similarity?",
            "How does embedding generation work?",
            "semantic search capabilities",
            "OpenAI text embedding model"
        ]
        
        for query in test_queries:
            print(f"   🔎 Searching for: '{query}'")
            
            search_data = {
                "query": query,
                "limit": 5,
                "score_threshold": 0.5
            }
            
            response = self.session.post(f"{BASE_URL}/vector/search", json=search_data)
            
            if response.status_code == 200:
                data = response.json()
                results = data["results"]
                print(f"   📊 Found {len(results)} results (search time: {data['search_time_ms']:.2f}ms)")
                
                for i, result in enumerate(results[:2]):  # Show top 2 results
                    print(f"      {i+1}. Score: {result['score']:.3f} | Text: {result['text'][:100]}...")
                    
            else:
                print(f"   ❌ Search failed: {response.status_code} - {response.text}")
                return False
                
        print("   ✅ Semantic search tests completed!")
        return True

    def get_indexing_stats(self) -> bool:
        """Get overall indexing statistics."""
        print("📈 Getting indexing statistics...")
        
        response = self.session.get(f"{BASE_URL}/vector/stats")
        
        if response.status_code == 200:
            data = response.json()
            stats = data["statistics"]
            
            print("   📊 Document Statistics:")
            doc_stats = stats["document_statistics"]
            for status, count in doc_stats.items():
                print(f"      {status}: {count}")
                
            print("   🗄️ Vector Storage Statistics:")
            storage_stats = stats["vector_storage_statistics"]
            print(f"      Collection: {storage_stats['name']}")
            print(f"      Points: {storage_stats['points_count']}")
            print(f"      Size: {storage_stats['vector_size']} dimensions")
            print(f"      Distance: {storage_stats['distance_metric']}")
            
            return True
        else:
            print(f"   ❌ Failed to get stats: {response.status_code} - {response.text}")
            return False

    def run_full_test(self) -> bool:
        """Run the complete vector indexing test."""
        print("🚀 Starting comprehensive vector indexing test...\n")
        
        success = True
        
        # Step 1: Authenticate
        if not self.authenticate():
            return False
            
        print()
        
        # Step 2: Check health
        if not self.check_vector_health():
            return False
            
        print()
        
        # Step 3: Create test document
        if not self.create_test_document():
            return False
            
        print()
        
        # Step 4: Convert document
        if not self.trigger_conversion():
            return False
            
        print()
        
        # Step 5: Index document
        if not self.trigger_indexing():
            return False
            
        print()
        
        # Step 6: Test search
        if not self.test_semantic_search():
            return False
            
        print()
        
        # Step 7: Get statistics
        if not self.get_indexing_stats():
            return False
            
        print("\n🎉 All vector indexing tests completed successfully!")
        return True


if __name__ == "__main__":
    tester = VectorIndexingTester()
    success = tester.run_full_test()
    
    if success:
        print("\n✅ Vector indexing system is working correctly!")
    else:
        print("\n❌ Vector indexing test failed!")
    
    exit(0 if success else 1) 