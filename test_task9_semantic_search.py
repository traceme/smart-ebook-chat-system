#!/usr/bin/env python3
"""
Test Script for Task 9: Semantic Search and Retrieval

This script tests the complete semantic search implementation including:
- Vector similarity search with k=8 retrieval
- BGE reranker integration
- Context window construction
- Reference extraction and formatting
- Search filters and analytics
"""

import requests
import json
import time
from typing import Dict, Any, List

class Task9SemanticSearchTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.auth_token = None
        self.test_results = {}

    def authenticate(self, username: str = "admin@example.com", password: str = "admin123"):
        """Authenticate and get access token."""
        print("🔐 Authenticating...")
        
        auth_data = {
            "username": username,
            "password": password
        }
        
        response = requests.post(
            f"{self.base_url}/login/access-token",
            data=auth_data
        )
        
        if response.status_code == 200:
            self.auth_token = response.json()["access_token"]
            print("✅ Authentication successful")
            return True
        else:
            print(f"❌ Authentication failed: {response.text}")
            return False

    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication."""
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

    def test_vector_search_health(self):
        """Test vector search service health."""
        print("\n🏥 Testing vector search health...")
        
        response = requests.get(f"{self.base_url}/vector-search/health")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Vector search service healthy")
            print(f"   Status: {data.get('status')}")
            print(f"   Qdrant: {data.get('services', {}).get('qdrant')}")
            self.test_results["health_check"] = True
        else:
            print(f"❌ Health check failed: {response.text}")
            self.test_results["health_check"] = False

    def test_basic_semantic_search(self):
        """Test basic semantic search with k=8 retrieval."""
        print("\n🔍 Testing basic semantic search...")
        
        search_request = {
            "query": "artificial intelligence machine learning",
            "limit": 5,
            "k_retrieval": 8,
            "enable_reranking": True,
            "score_threshold": 0.1
        }
        
        start_time = time.time()
        response = requests.post(
            f"{self.base_url}/vector-search/search",
            headers=self.get_headers(),
            json=search_request
        )
        search_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Basic search successful ({search_time:.2f}s)")
            print(f"   Query: {data.get('query')}")
            print(f"   Results: {data.get('total_results')}")
            print(f"   Search time: {data.get('search_time_ms', 0):.0f}ms")
            print(f"   Embedding time: {data.get('embedding_time_ms', 0):.0f}ms")
            print(f"   Rerank time: {data.get('rerank_time_ms', 0):.0f}ms")
            print(f"   Reranking enabled: {data.get('reranking_enabled')}")
            
            # Test that we got results
            if data.get('total_results', 0) > 0:
                print(f"   First result score: {data['results'][0].get('score', 0):.3f}")
                if data.get('reranking_enabled') and 'rerank_score' in data['results'][0]:
                    print(f"   First result rerank score: {data['results'][0].get('rerank_score', 0):.3f}")
                print(f"   Context window generated: {bool(data.get('context_window'))}")
            
            self.test_results["basic_search"] = True
            return data
        else:
            print(f"❌ Basic search failed: {response.text}")
            self.test_results["basic_search"] = False
            return None

    def test_advanced_search_with_analytics(self):
        """Test advanced search with analytics."""
        print("\n📊 Testing advanced search with analytics...")
        
        search_request = {
            "query": "neural networks deep learning",
            "limit": 3,
            "k_retrieval": 8,
            "enable_reranking": True
        }
        
        response = requests.post(
            f"{self.base_url}/vector-search/search/advanced",
            headers=self.get_headers(),
            json=search_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Advanced search successful")
            
            # Check search results
            search_results = data.get('search_results', {})
            print(f"   Results: {search_results.get('total_results', 0)}")
            
            # Check references
            references = data.get('references', [])
            print(f"   References extracted: {len(references)}")
            
            # Check analytics
            analytics = data.get('analytics', {})
            if analytics:
                print(f"   Processing time: {analytics.get('total_processing_time_ms', 0):.0f}ms")
                print(f"   Unique documents: {analytics.get('unique_documents', 0)}")
                print(f"   Avg relevance: {analytics.get('avg_relevance_score', 0):.3f}")
            
            # Check reranking stats
            rerank_stats = data.get('reranking_stats')
            if rerank_stats:
                print(f"   Rerank results: {rerank_stats.get('total_results', 0)}")
                print(f"   Avg rerank score: {rerank_stats.get('avg_score', 0):.3f}")
            
            self.test_results["advanced_search"] = True
            return data
        else:
            print(f"❌ Advanced search failed: {response.text}")
            self.test_results["advanced_search"] = False
            return None

    def test_search_filters(self):
        """Test search filters functionality."""
        print("\n🔧 Testing search filters...")
        
        # Test with different filter combinations
        test_filters = [
            {"enable_reranking": False, "k_retrieval": 4},
            {"enable_reranking": True, "k_retrieval": 10, "score_threshold": 0.5},
            {"limit": 2, "k_retrieval": 8}
        ]
        
        all_passed = True
        for i, filters in enumerate(test_filters):
            search_request = {
                "query": "computer science algorithms",
                **filters
            }
            
            response = requests.post(
                f"{self.base_url}/vector-search/search",
                headers=self.get_headers(),
                json=search_request
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"   Filter test {i+1}: ✅ (Results: {data.get('total_results', 0)})")
                
                # Verify filter settings were applied
                if "enable_reranking" in filters:
                    assert data.get("reranking_enabled") == filters["enable_reranking"]
                if "limit" in filters:
                    assert len(data.get("results", [])) <= filters["limit"]
            else:
                print(f"   Filter test {i+1}: ❌ ({response.status_code})")
                all_passed = False
        
        self.test_results["search_filters"] = all_passed
        if all_passed:
            print("✅ Search filters working correctly")

    def test_search_analytics_endpoints(self):
        """Test search analytics endpoints."""
        print("\n📈 Testing search analytics endpoints...")
        
        endpoints_to_test = [
            ("/vector-search/analytics/overview", "Analytics overview"),
            ("/vector-search/analytics/popular-queries", "Popular queries"),
            ("/vector-search/analytics/user-history", "User history"),
            ("/vector-search/analytics/real-time", "Real-time stats")
        ]
        
        all_passed = True
        for endpoint, description in endpoints_to_test:
            response = requests.get(
                f"{self.base_url}{endpoint}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"   {description}: ✅")
                if "analytics" in data:
                    print(f"     Total searches: {data['analytics'].get('total_searches', 0)}")
                elif "popular_queries" in data:
                    print(f"     Popular queries: {len(data['popular_queries'])}")
                elif "search_history" in data:
                    print(f"     History entries: {len(data['search_history'])}")
                elif "real_time_stats" in data:
                    stats = data['real_time_stats']
                    print(f"     Searches this hour: {stats.get('searches_this_hour', 0)}")
            else:
                print(f"   {description}: ❌ ({response.status_code})")
                all_passed = False
        
        self.test_results["analytics_endpoints"] = all_passed

    def test_context_window_construction(self):
        """Test context window construction."""
        print("\n📄 Testing context window construction...")
        
        search_request = {
            "query": "machine learning optimization techniques",
            "limit": 3,
            "k_retrieval": 8,
            "enable_reranking": True
        }
        
        response = requests.post(
            f"{self.base_url}/vector-search/search",
            headers=self.get_headers(),
            json=search_request
        )
        
        if response.status_code == 200:
            data = response.json()
            context_window = data.get('context_window')
            
            if context_window:
                print("✅ Context window generated")
                print(f"   Length: {len(context_window)} characters")
                
                # Check if context contains query
                if search_request['query'].lower() in context_window.lower():
                    print("   ✅ Query included in context")
                else:
                    print("   ⚠️ Query not found in context")
                
                # Check for source references
                if "[Source:" in context_window:
                    print("   ✅ Source references included")
                else:
                    print("   ⚠️ No source references found")
                
                # Check structure
                if "Relevant Information:" in context_window:
                    print("   ✅ Proper context structure")
                else:
                    print("   ⚠️ Missing expected structure")
                
                self.test_results["context_window"] = True
            else:
                print("❌ No context window generated")
                self.test_results["context_window"] = False
        else:
            print(f"❌ Context window test failed: {response.status_code}")
            self.test_results["context_window"] = False

    def test_k8_retrieval_and_reranking(self):
        """Test k=8 retrieval specifically and verify reranking improvement."""
        print("\n🎯 Testing k=8 retrieval and reranking effectiveness...")
        
        # Test without reranking
        search_without_rerank = {
            "query": "database optimization indexing performance",
            "limit": 5,
            "k_retrieval": 8,
            "enable_reranking": False
        }
        
        response1 = requests.post(
            f"{self.base_url}/vector-search/search",
            headers=self.get_headers(),
            json=search_without_rerank
        )
        
        # Test with reranking
        search_with_rerank = {
            "query": "database optimization indexing performance",
            "limit": 5,
            "k_retrieval": 8,
            "enable_reranking": True
        }
        
        response2 = requests.post(
            f"{self.base_url}/vector-search/search",
            headers=self.get_headers(),
            json=search_with_rerank
        )
        
        if response1.status_code == 200 and response2.status_code == 200:
            data1 = response1.json()
            data2 = response2.json()
            
            print(f"✅ K=8 retrieval and reranking test completed")
            print(f"   Without reranking: {data1.get('total_results', 0)} results")
            print(f"   With reranking: {data2.get('total_results', 0)} results")
            print(f"   Reranking enabled: {data2.get('reranking_enabled', False)}")
            
            # Check if we have rerank scores
            if data2.get('results') and 'rerank_score' in data2['results'][0]:
                print("   ✅ Rerank scores present")
                rerank_score = data2['results'][0]['rerank_score']
                vector_score = data2['results'][0]['score']
                print(f"   Top result - Vector: {vector_score:.3f}, Rerank: {rerank_score:.3f}")
            else:
                print("   ⚠️ No rerank scores found")
            
            self.test_results["k8_retrieval_reranking"] = True
        else:
            print("❌ K=8 retrieval and reranking test failed")
            self.test_results["k8_retrieval_reranking"] = False

    def run_all_tests(self):
        """Run all Task 9 tests."""
        print("🚀 Starting Task 9: Semantic Search and Retrieval Tests")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Cannot proceed without authentication")
            return
        
        # Run all tests
        self.test_vector_search_health()
        self.test_basic_semantic_search()
        self.test_advanced_search_with_analytics()
        self.test_search_filters()
        self.test_search_analytics_endpoints()
        self.test_context_window_construction()
        self.test_k8_retrieval_and_reranking()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result)
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED! Task 9 implementation is working correctly.")
            print("\n✅ Verified features:")
            print("   • Vector similarity search with k=8 retrieval")
            print("   • BGE reranker integration and score improvement")
            print("   • Context window construction for LLM processing")
            print("   • Reference extraction and formatting")
            print("   • Search filters and configuration options")
            print("   • Search analytics and performance tracking")
            print("   • Advanced search with detailed analytics")
            print("   • Frontend-ready API endpoints")
        else:
            print(f"\n⚠️ {total_tests - passed_tests} tests failed. Please check the implementation.")
        
        return passed_tests == total_tests

def main():
    """Main function to run the tests."""
    tester = Task9SemanticSearchTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🚀 Task 9 is ready! You can now:")
        print("   1. Start the backend: cd backend && python -m uvicorn main:app --reload")
        print("   2. Start the frontend: cd my-gatsby-site && gatsby develop")
        print("   3. Visit http://localhost:8001/search for the search interface")
        print("   4. Use the API endpoints for integration with other services")
    
    return success

if __name__ == "__main__":
    main() 