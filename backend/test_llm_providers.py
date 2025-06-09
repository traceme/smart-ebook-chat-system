#!/usr/bin/env python3
"""
Test script for LLM Provider Abstraction

This script demonstrates the functionality of the LLM provider abstraction layer,
including provider initialization, cost estimation, token counting, and completions.
"""

import asyncio
import os
import sys
import json
from typing import Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import our LLM provider modules
from app.services.llm_providers import initialize_providers, get_provider
from app.services.llm_providers.cost_calculator import get_cost_calculator
from app.services.llm_providers.token_counter import get_token_counter
from app.services.llm_providers.provider_factory import get_provider_factory


async def test_provider_initialization():
    """Test provider initialization with mock API keys."""
    print("🔧 Testing Provider Initialization...")
    
    # Mock configuration for testing (you would use real API keys in production)
    test_config = {
        "openai_test": {
            "type": "openai",
            "api_key": "test-key-openai",  # Mock key for testing
            "enabled": True,
            "priority": 1,
            "weight": 1.0,
            "max_retries": 3,
            "timeout": 30,
            "fallback": True,
            "options": {
                "default_model": "gpt-4o-mini"
            }
        },
        "claude_test": {
            "type": "claude",
            "api_key": "test-key-claude",  # Mock key for testing
            "enabled": True,
            "priority": 2,
            "weight": 1.0,
            "max_retries": 3,
            "timeout": 30,
            "fallback": True,
            "options": {
                "default_model": "claude-3-5-sonnet-20241022"
            }
        },
        "gemini_test": {
            "type": "gemini",
            "api_key": "test-key-gemini",  # Mock key for testing
            "enabled": True,
            "priority": 3,
            "weight": 1.0,
            "max_retries": 3,
            "timeout": 30,
            "fallback": True,
            "options": {
                "default_model": "gemini-2.0-flash-exp"
            }
        }
    }
    
    try:
        registered = initialize_providers(test_config)
        print(f"✅ Successfully registered providers: {registered}")
        return True
    except Exception as e:
        print(f"❌ Provider initialization failed: {e}")
        return False


def test_token_counting():
    """Test token counting functionality."""
    print("\n📊 Testing Token Counting...")
    
    counter = get_token_counter()
    
    # Test text
    test_text = "Hello, how are you today? I hope you're having a great day!"
    
    # Test different providers
    providers = ["openai", "claude", "gemini"]
    
    for provider in providers:
        result = counter.count_tokens(test_text, provider=provider)
        print(f"  {provider.upper()}: {result.tokens} tokens ({result.method.value}, confidence: {result.confidence:.2f})")
    
    # Test message format
    test_messages = [
        {"role": "user", "content": "What is the capital of France?"},
        {"role": "assistant", "content": "The capital of France is Paris."},
        {"role": "user", "content": "Tell me more about it."}
    ]
    
    print(f"\n  Message format token counts:")
    for provider in providers:
        result = counter.count_tokens(test_messages, provider=provider)
        print(f"  {provider.upper()}: {result.tokens} tokens ({result.method.value})")


def test_cost_estimation():
    """Test cost estimation functionality."""
    print("\n💰 Testing Cost Estimation...")
    
    calculator = get_cost_calculator()
    
    # Test message for cost estimation
    test_messages = [
        {"role": "user", "content": "Write a detailed explanation of machine learning in 200 words."}
    ]
    
    # Get token count first
    counter = get_token_counter()
    input_count = counter.count_tokens(test_messages, provider="openai")
    input_tokens = input_count.tokens
    estimated_output_tokens = 250  # Estimate for 200 words
    
    print(f"  Input tokens: {input_tokens}")
    print(f"  Estimated output tokens: {estimated_output_tokens}")
    print()
    
    # Test different models
    test_models = [
        ("openai", "gpt-4o"),
        ("openai", "gpt-4o-mini"), 
        ("openai", "gpt-3.5-turbo"),
        ("claude", "claude-3-5-sonnet-20241022"),
        ("claude", "claude-3-haiku-20240307"),
        ("gemini", "gemini-1.5-pro"),
        ("gemini", "gemini-1.5-flash"),
        ("gemini", "gemini-2.0-flash-exp"),
    ]
    
    costs = []
    for provider, model in test_models:
        try:
            breakdown = calculator.estimate_cost(
                provider=provider,
                model=model,
                input_tokens=input_tokens,
                estimated_output_tokens=estimated_output_tokens
            )
            costs.append((f"{provider}/{model}", breakdown.total_cost))
            print(f"  {provider.upper()} {model}: ${breakdown.total_cost:.6f}")
        except Exception as e:
            print(f"  {provider.upper()} {model}: Error - {e}")
    
    # Find cheapest and most expensive
    if costs:
        costs.sort(key=lambda x: x[1])
        print(f"\n  💡 Cheapest: {costs[0][0]} (${costs[0][1]:.6f})")
        print(f"  💸 Most expensive: {costs[-1][0]} (${costs[-1][1]:.6f})")
        savings = costs[-1][1] - costs[0][1]
        print(f"  📈 Potential savings: ${savings:.6f} ({(savings/costs[-1][1]*100):.1f}%)")


def test_model_information():
    """Test model information functionality."""
    print("\n🤖 Testing Model Information...")
    
    calculator = get_cost_calculator()
    
    # Get information about different models
    test_models = [
        "gpt-4o",
        "claude-3-5-sonnet-20241022", 
        "gemini-2.0-flash-exp"
    ]
    
    for model in test_models:
        info = calculator.get_model_info(model)
        if info:
            print(f"\n  📋 {model}:")
            print(f"    Provider: {info['provider']}")
            print(f"    Context window: {info['capabilities']['context_window']:,} tokens")
            print(f"    Max output: {info['capabilities']['max_output_tokens']:,} tokens")
            print(f"    Input cost: ${info['pricing']['input_cost_per_1k']:.4f}/1K tokens")
            print(f"    Output cost: ${info['pricing']['output_cost_per_1k']:.4f}/1K tokens")


async def test_provider_health():
    """Test provider health checking."""
    print("\n🏥 Testing Provider Health...")
    
    factory = get_provider_factory()
    
    # Get available providers
    available = factory.get_available_providers()
    print(f"  Available providers: {available}")
    
    # Test individual provider health (will fail with mock keys, but shows structure)
    for provider_name in available:
        try:
            provider = await get_provider(provider_name)
            if provider:
                print(f"\n  🔍 Testing {provider_name}:")
                print(f"    Supported models: {len(provider.supported_models)}")
                print(f"    Default models: {provider.default_models}")
                
                # Health check will fail with mock keys, but that's expected
                health = await provider.health_check()
                print(f"    Health status: {health.get('status', 'unknown')}")
                if health.get('error'):
                    print(f"    Expected error (mock key): {health['error'][:100]}...")
        except Exception as e:
            print(f"    Error testing {provider_name}: {str(e)[:100]}...")


def print_summary():
    """Print a summary of the LLM provider system."""
    print("\n" + "="*60)
    print("🎯 LLM Provider Abstraction System Summary")
    print("="*60)
    print("""
This system provides:

🔧 UNIFIED INTERFACE
   • Single API for OpenAI, Claude, and Gemini models
   • Automatic provider selection and fallback
   • Consistent request/response format across providers

💰 COST OPTIMIZATION
   • Real-time cost estimation before requests
   • Multi-provider cost comparison
   • Usage tracking and analytics
   • Budget monitoring capabilities

📊 TOKEN MANAGEMENT
   • Accurate token counting using native tokenizers
   • Fallback estimation for unsupported models
   • Support for different message formats

🏥 HEALTH MONITORING
   • Provider availability checking
   • Performance metrics tracking
   • Automatic error handling and recovery

🎛️ FLEXIBLE CONFIGURATION
   • Multiple selection strategies (cost, speed, quality)
   • Load balancing and failover
   • Per-provider configuration options

🔗 API ENDPOINTS
   • POST /api/v1/llm-providers/complete - Generate completions
   • POST /api/v1/llm-providers/estimate-cost - Cost estimation
   • POST /api/v1/llm-providers/count-tokens - Token counting
   • GET  /api/v1/llm-providers/providers - Provider status
   • GET  /api/v1/llm-providers/models - Available models
   • GET  /api/v1/llm-providers/usage-statistics - Usage analytics

📝 INTEGRATION EXAMPLE:
   
   import requests
   
   # Generate completion with automatic provider selection
   response = requests.post('/api/v1/llm-providers/complete', json={
       'messages': [{'role': 'user', 'content': 'Hello!'}],
       'temperature': 0.7,
       'fallback': True
   })
   
   # Compare costs across providers
   costs = requests.post('/api/v1/llm-providers/estimate-cost', json={
       'messages': [{'role': 'user', 'content': 'Hello!'}],
       'max_tokens': 100
   })
""")
    print("="*60)


async def main():
    """Run all tests and demonstrations."""
    print("🚀 LLM Provider Abstraction System Demo")
    print("="*50)
    
    # Test provider initialization
    success = await test_provider_initialization()
    
    if success:
        # Test token counting
        test_token_counting()
        
        # Test cost estimation
        test_cost_estimation()
        
        # Test model information
        test_model_information()
        
        # Test provider health
        await test_provider_health()
    
    # Print summary
    print_summary()
    
    print("\n✨ Demo completed! The LLM Provider Abstraction system is ready.")
    print("🔑 To use with real providers, add your API keys to the environment:")
    print("   export OPENAI_API_KEY='your-openai-key'")
    print("   export ANTHROPIC_API_KEY='your-claude-key'") 
    print("   export GOOGLE_AI_API_KEY='your-gemini-key'")


if __name__ == "__main__":
    asyncio.run(main()) 