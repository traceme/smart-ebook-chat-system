#!/usr/bin/env python3
"""
Comprehensive Chat Interface Test Suite
Tests all chat functionality including conversations, messages, and document-based chat.
"""

import requests
import json
import time
import uuid
from typing import Dict, Any, Optional


class ChatInterfaceTest:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: Dict[str, Any] = None):
        """Log test result."""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            for key, value in details.items():
                print(f"    {key}: {value}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details or {}
        })
    
    def authenticate(self) -> bool:
        """Authenticate and get access token."""
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/login/access-token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data="username=test3@example.com&password=testpassword123"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                self.log_test("Authentication", True, {"token_type": data.get("token_type")})
                return True
            else:
                self.log_test("Authentication", False, {"status_code": response.status_code, "error": response.text})
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, {"error": str(e)})
            return False
    
    def test_chat_health(self) -> bool:
        """Test chat service health."""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/chat/health")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Chat Health Check", True, {
                    "status": data.get("status"),
                    "service": data.get("service"),
                    "features": len(data.get("features", []))
                })
                return True
            else:
                self.log_test("Chat Health Check", False, {"status_code": response.status_code})
                return False
                
        except Exception as e:
            self.log_test("Chat Health Check", False, {"error": str(e)})
            return False
    
    def test_simple_chat_message(self) -> Optional[str]:
        """Test sending a simple chat message."""
        try:
            start_time = time.time()
            response = self.session.post(
                f"{self.base_url}/api/v1/chat/message",
                json={"message": "Hello! What can you help me with?"}
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                conversation_id = data.get("conversation_id")
                
                self.log_test("Simple Chat Message", True, {
                    "conversation_id": conversation_id[:8] + "...",
                    "response_time": f"{response_time:.3f}s",
                    "message_length": len(data.get("message", "")),
                    "sources_count": data.get("search_results_count", 0)
                })
                return conversation_id
            else:
                self.log_test("Simple Chat Message", False, {
                    "status_code": response.status_code,
                    "error": response.text
                })
                return None
                
        except Exception as e:
            self.log_test("Simple Chat Message", False, {"error": str(e)})
            return None
    
    def test_conversation_history(self, conversation_id: str) -> bool:
        """Test getting conversation history."""
        try:
            response = self.session.get(
                f"{self.base_url}/api/v1/chat/conversations/{conversation_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get("messages", [])
                
                self.log_test("Conversation History", True, {
                    "conversation_id": data.get("id"),
                    "title": data.get("title"),
                    "message_count": len(messages),
                    "user_messages": len([m for m in messages if m["role"] == "user"]),
                    "assistant_messages": len([m for m in messages if m["role"] == "assistant"])
                })
                return True
            else:
                self.log_test("Conversation History", False, {
                    "status_code": response.status_code,
                    "error": response.text
                })
                return False
                
        except Exception as e:
            self.log_test("Conversation History", False, {"error": str(e)})
            return False
    
    def test_conversation_list(self) -> bool:
        """Test getting conversation list."""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/chat/conversations")
            
            if response.status_code == 200:
                data = response.json()
                conversations = data.get("conversations", [])
                
                self.log_test("Conversation List", True, {
                    "total_conversations": len(conversations),
                    "conversation_titles": [c.get("title", "")[:30] + "..." for c in conversations[:3]]
                })
                return True
            else:
                self.log_test("Conversation List", False, {
                    "status_code": response.status_code,
                    "error": response.text
                })
                return False
                
        except Exception as e:
            self.log_test("Conversation List", False, {"error": str(e)})
            return False
    
    def test_continue_conversation(self, conversation_id: str) -> bool:
        """Test continuing an existing conversation."""
        try:
            start_time = time.time()
            response = self.session.post(
                f"{self.base_url}/api/v1/chat/message",
                json={
                    "message": "Can you tell me more about the features available?",
                    "conversation_id": conversation_id
                }
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify it's the same conversation
                returned_conversation_id = data.get("conversation_id")
                same_conversation = returned_conversation_id == conversation_id
                
                self.log_test("Continue Conversation", True, {
                    "same_conversation": same_conversation,
                    "response_time": f"{response_time:.3f}s",
                    "message_preview": data.get("message", "")[:100] + "...",
                    "sources_count": data.get("search_results_count", 0)
                })
                return True
            else:
                self.log_test("Continue Conversation", False, {
                    "status_code": response.status_code,
                    "error": response.text
                })
                return False
                
        except Exception as e:
            self.log_test("Continue Conversation", False, {"error": str(e)})
            return False
    
    def test_create_conversation(self) -> Optional[str]:
        """Test creating a new conversation explicitly."""
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/chat/conversations",
                json={"title": "Test Conversation"}
            )
            
            if response.status_code == 200:
                data = response.json()
                conversation_id = data.get("id")
                
                self.log_test("Create Conversation", True, {
                    "conversation_id": conversation_id,
                    "title": data.get("title"),
                    "created_at": data.get("created_at")
                })
                return conversation_id
            else:
                self.log_test("Create Conversation", False, {
                    "status_code": response.status_code,
                    "error": response.text
                })
                return None
                
        except Exception as e:
            self.log_test("Create Conversation", False, {"error": str(e)})
            return None
    
    def test_update_conversation(self, conversation_id: str) -> bool:
        """Test updating conversation title."""
        try:
            new_title = "Updated Test Conversation"
            response = self.session.put(
                f"{self.base_url}/api/v1/chat/conversations/{conversation_id}",
                json={"title": new_title}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                self.log_test("Update Conversation", True, {
                    "conversation_id": data.get("id"),
                    "new_title": data.get("title"),
                    "updated_at": data.get("updated_at")
                })
                return True
            else:
                self.log_test("Update Conversation", False, {
                    "status_code": response.status_code,
                    "error": response.text
                })
                return False
                
        except Exception as e:
            self.log_test("Update Conversation", False, {"error": str(e)})
            return False
    
    def test_delete_conversation(self, conversation_id: str) -> bool:
        """Test deleting a conversation."""
        try:
            response = self.session.delete(
                f"{self.base_url}/api/v1/chat/conversations/{conversation_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                
                self.log_test("Delete Conversation", True, {
                    "message": data.get("message"),
                    "deleted_conversation_id": conversation_id
                })
                return True
            else:
                self.log_test("Delete Conversation", False, {
                    "status_code": response.status_code,
                    "error": response.text
                })
                return False
                
        except Exception as e:
            self.log_test("Delete Conversation", False, {"error": str(e)})
            return False
    
    def test_chat_with_different_message_types(self) -> bool:
        """Test chat with different types of messages."""
        test_messages = [
            "What is machine learning?",
            "How does neural network training work?",
            "Can you explain deep learning concepts?",
            "What are the benefits of AI?",
            "Tell me about natural language processing."
        ]
        
        try:
            total_response_time = 0
            successful_messages = 0
            
            for i, message in enumerate(test_messages):
                start_time = time.time()
                response = self.session.post(
                    f"{self.base_url}/api/v1/chat/message",
                    json={"message": message}
                )
                response_time = time.time() - start_time
                total_response_time += response_time
                
                if response.status_code == 200:
                    successful_messages += 1
            
            avg_response_time = total_response_time / len(test_messages)
            success_rate = successful_messages / len(test_messages) * 100
            
            self.log_test("Different Message Types", successful_messages == len(test_messages), {
                "total_messages": len(test_messages),
                "successful_messages": successful_messages,
                "success_rate": f"{success_rate:.1f}%",
                "avg_response_time": f"{avg_response_time:.3f}s"
            })
            
            return successful_messages == len(test_messages)
            
        except Exception as e:
            self.log_test("Different Message Types", False, {"error": str(e)})
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all chat interface tests."""
        print("🚀 Chat Interface Test Suite")
        print("=" * 50)
        
        # Authenticate first
        if not self.authenticate():
            return self.generate_report()
        
        # Run health check
        self.test_chat_health()
        
        # Test basic chat functionality
        conversation_id = self.test_simple_chat_message()
        
        if conversation_id:
            # Test conversation operations
            self.test_conversation_history(conversation_id)
            self.test_conversation_list()
            self.test_continue_conversation(conversation_id)
        
        # Test conversation management
        new_conversation_id = self.test_create_conversation()
        if new_conversation_id:
            self.test_update_conversation(new_conversation_id)
            self.test_delete_conversation(new_conversation_id)
        
        # Test different message types
        self.test_chat_with_different_message_types()
        
        return self.generate_report()
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate test report."""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details'].get('error', 'Unknown error')}")
        
        print(f"\n{'🎉 ALL TESTS PASSED!' if failed_tests == 0 else '⚠️  SOME TESTS FAILED'}")
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": success_rate,
            "test_results": self.test_results
        }


if __name__ == "__main__":
    tester = ChatInterfaceTest()
    report = tester.run_all_tests()
    
    # Save detailed report
    with open("chat_test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: chat_test_report.json")
    print(f"\n📄 Chat Interface Testing Complete") 