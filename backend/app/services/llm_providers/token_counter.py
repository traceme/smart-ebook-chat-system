"""
Token Counter for LLM Providers

Provides accurate token counting across different LLM providers
with fallback estimation methods when exact tokenizers aren't available.
"""

import logging
import re
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# Try to import tiktoken for OpenAI models
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    logger.warning("tiktoken not available, using estimation for OpenAI models")


class TokenizerType(Enum):
    """Types of tokenizers."""
    TIKTOKEN = "tiktoken"
    SENTENCEPIECE = "sentencepiece"
    ESTIMATION = "estimation"


@dataclass
class TokenCount:
    """Token count result."""
    tokens: int
    method: TokenizerType
    model: Optional[str] = None
    confidence: float = 1.0  # Confidence in the count (0.0-1.0)
    
    def __str__(self) -> str:
        return f"{self.tokens} tokens ({self.method.value})"


class TokenCounter:
    """
    Universal token counter for LLM providers.
    
    Features:
    - Provider-specific token counting
    - Accurate counting using native tokenizers when available
    - Fallback estimation methods
    - Message format handling
    - Batch counting capabilities
    """
    
    # Estimation factors for different providers (chars per token)
    ESTIMATION_FACTORS = {
        "openai": 4.0,    # GPT models: ~4 chars per token
        "claude": 3.8,    # Claude models: ~3.8 chars per token
        "gemini": 3.5,    # Gemini models: ~3.5 chars per token
    }
    
    # Model-specific tokenizer mappings
    TIKTOKEN_MODELS = {
        # GPT-4o models
        "gpt-4o": "gpt-4o",
        "gpt-4o-2024-05-13": "gpt-4o",
        "gpt-4o-2024-08-06": "gpt-4o",
        "gpt-4o-mini": "gpt-4o",
        "gpt-4o-mini-2024-07-18": "gpt-4o",
        
        # GPT-4 models
        "gpt-4": "gpt-4",
        "gpt-4-0613": "gpt-4",
        "gpt-4-turbo": "gpt-4",
        "gpt-4-turbo-2024-04-09": "gpt-4",
        "gpt-4-1106-preview": "gpt-4",
        "gpt-4-0125-preview": "gpt-4",
        "gpt-4-turbo-preview": "gpt-4",
        
        # GPT-3.5 models
        "gpt-3.5-turbo": "gpt-3.5-turbo",
        "gpt-3.5-turbo-0125": "gpt-3.5-turbo",
        "gpt-3.5-turbo-1106": "gpt-3.5-turbo",
        "gpt-3.5-turbo-instruct": "gpt-3.5-turbo",
    }
    
    def __init__(self):
        """Initialize token counter."""
        self._tiktoken_encoders = {}
        self._load_tiktoken_encoders()
    
    def _load_tiktoken_encoders(self):
        """Load tiktoken encoders if available."""
        if not TIKTOKEN_AVAILABLE:
            return
        
        try:
            # Load common encoders
            unique_models = set(self.TIKTOKEN_MODELS.values())
            for model in unique_models:
                try:
                    encoder = tiktoken.encoding_for_model(model)
                    self._tiktoken_encoders[model] = encoder
                except Exception as e:
                    logger.warning(f"Could not load tiktoken encoder for {model}: {e}")
            
            # Load cl100k_base as fallback
            try:
                self._tiktoken_encoders["cl100k_base"] = tiktoken.get_encoding("cl100k_base")
            except Exception as e:
                logger.warning(f"Could not load cl100k_base encoder: {e}")
                
        except Exception as e:
            logger.error(f"Error loading tiktoken encoders: {e}")
    
    def count_tokens(
        self,
        text: Union[str, List[Dict[str, str]]],
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> TokenCount:
        """
        Count tokens in text or messages.
        
        Args:
            text: Text string or list of message dictionaries
            model: Model name for accurate counting
            provider: Provider name for fallback estimation
            
        Returns:
            Token count result
        """
        # Determine provider from model if not specified
        if not provider and model:
            provider = self._get_provider_from_model(model)
        
        # Handle different input types
        if isinstance(text, list):
            return self._count_message_tokens(text, model, provider)
        else:
            return self._count_text_tokens(text, model, provider)
    
    def _count_message_tokens(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> TokenCount:
        """Count tokens in a list of messages."""
        provider = provider or "openai"  # Default to OpenAI format
        
        if provider == "openai" and model and TIKTOKEN_AVAILABLE:
            return self._count_openai_message_tokens(messages, model)
        elif provider == "claude":
            return self._count_claude_message_tokens(messages)
        elif provider == "gemini":
            return self._count_gemini_message_tokens(messages)
        else:
            return self._estimate_message_tokens(messages, provider)
    
    def _count_text_tokens(
        self,
        text: str,
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> TokenCount:
        """Count tokens in plain text."""
        provider = provider or "openai"  # Default to OpenAI
        
        if provider == "openai" and model and TIKTOKEN_AVAILABLE:
            return self._count_openai_text_tokens(text, model)
        else:
            return self._estimate_text_tokens(text, provider)
    
    def _count_openai_message_tokens(
        self,
        messages: List[Dict[str, str]],
        model: str
    ) -> TokenCount:
        """Count tokens for OpenAI messages using tiktoken."""
        if not TIKTOKEN_AVAILABLE:
            return self._estimate_message_tokens(messages, "openai")
        
        try:
            # Get the appropriate encoder
            encoder_key = self.TIKTOKEN_MODELS.get(model, "cl100k_base")
            encoder = self._tiktoken_encoders.get(encoder_key)
            
            if not encoder:
                # Fallback to cl100k_base
                encoder = self._tiktoken_encoders.get("cl100k_base")
                
            if not encoder:
                return self._estimate_message_tokens(messages, "openai")
            
            # Count tokens for each message
            total_tokens = 0
            
            for message in messages:
                # Each message follows <|start|>{role/name}\n{content}<|end|>\n
                total_tokens += 4  # Message formatting tokens
                
                for key, value in message.items():
                    if isinstance(value, str):
                        total_tokens += len(encoder.encode(value))
                    
                    if key == "name":  # If there's a name, the role is omitted
                        total_tokens -= 1  # Role is omitted
            
            total_tokens += 3  # Every reply is primed with <|start|>assistant<|message|>
            
            return TokenCount(
                tokens=total_tokens,
                method=TokenizerType.TIKTOKEN,
                model=model,
                confidence=0.95
            )
            
        except Exception as e:
            logger.warning(f"tiktoken counting failed for {model}: {e}")
            return self._estimate_message_tokens(messages, "openai")
    
    def _count_openai_text_tokens(self, text: str, model: str) -> TokenCount:
        """Count tokens for OpenAI text using tiktoken."""
        if not TIKTOKEN_AVAILABLE:
            return self._estimate_text_tokens(text, "openai")
        
        try:
            encoder_key = self.TIKTOKEN_MODELS.get(model, "cl100k_base")
            encoder = self._tiktoken_encoders.get(encoder_key)
            
            if not encoder:
                encoder = self._tiktoken_encoders.get("cl100k_base")
                
            if not encoder:
                return self._estimate_text_tokens(text, "openai")
            
            tokens = len(encoder.encode(text))
            
            return TokenCount(
                tokens=tokens,
                method=TokenizerType.TIKTOKEN,
                model=model,
                confidence=0.98
            )
            
        except Exception as e:
            logger.warning(f"tiktoken counting failed for {model}: {e}")
            return self._estimate_text_tokens(text, "openai")
    
    def _count_claude_message_tokens(self, messages: List[Dict[str, str]]) -> TokenCount:
        """Count tokens for Claude messages."""
        # Claude uses different message format
        total_chars = 0
        
        # Separate system messages from conversation
        system_chars = 0
        conversation_chars = 0
        
        for message in messages:
            content = message.get("content", "")
            role = message.get("role", "")
            
            if role == "system":
                system_chars += len(content)
            else:
                conversation_chars += len(content) + len(role) + 10  # Role formatting
        
        total_chars = system_chars + conversation_chars
        
        # Claude estimation: ~3.8 characters per token
        estimated_tokens = int(total_chars / 3.8)
        
        # Add overhead for message formatting
        estimated_tokens += len(messages) * 3
        
        return TokenCount(
            tokens=estimated_tokens,
            method=TokenizerType.ESTIMATION,
            confidence=0.85
        )
    
    def _count_gemini_message_tokens(self, messages: List[Dict[str, str]]) -> TokenCount:
        """Count tokens for Gemini messages."""
        total_chars = 0
        
        # Separate system instructions from conversation
        system_chars = 0
        conversation_chars = 0
        
        for message in messages:
            content = message.get("content", "")
            role = message.get("role", "")
            
            if role == "system":
                system_chars += len(content)
            else:
                conversation_chars += len(content) + 10  # Formatting overhead
        
        total_chars = system_chars + conversation_chars
        
        # Gemini estimation: ~3.5 characters per token
        estimated_tokens = int(total_chars / 3.5)
        
        # Add overhead for message formatting
        estimated_tokens += len(messages) * 2
        
        return TokenCount(
            tokens=estimated_tokens,
            method=TokenizerType.ESTIMATION,
            confidence=0.80
        )
    
    def _estimate_message_tokens(
        self,
        messages: List[Dict[str, str]],
        provider: str
    ) -> TokenCount:
        """Estimate tokens for messages using character counting."""
        total_chars = 0
        
        for message in messages:
            for key, value in message.items():
                if isinstance(value, str):
                    total_chars += len(value)
            # Add overhead for role and formatting
            total_chars += 20
        
        factor = self.ESTIMATION_FACTORS.get(provider, 4.0)
        estimated_tokens = int(total_chars / factor)
        
        return TokenCount(
            tokens=estimated_tokens,
            method=TokenizerType.ESTIMATION,
            confidence=0.75
        )
    
    def _estimate_text_tokens(self, text: str, provider: str) -> TokenCount:
        """Estimate tokens for plain text."""
        # Basic character-based estimation
        char_count = len(text)
        factor = self.ESTIMATION_FACTORS.get(provider, 4.0)
        
        # Adjust for different text characteristics
        if self._is_code_heavy(text):
            factor *= 0.8  # Code tends to have more tokens per character
        elif self._is_natural_language(text):
            factor *= 1.1  # Natural language tends to have fewer tokens per character
        
        estimated_tokens = max(1, int(char_count / factor))
        
        return TokenCount(
            tokens=estimated_tokens,
            method=TokenizerType.ESTIMATION,
            confidence=0.70
        )
    
    def _get_provider_from_model(self, model: str) -> str:
        """Determine provider from model name."""
        model_lower = model.lower()
        
        if "gpt" in model_lower or "openai" in model_lower:
            return "openai"
        elif "claude" in model_lower:
            return "claude"
        elif "gemini" in model_lower:
            return "gemini"
        else:
            return "openai"  # Default fallback
    
    def _is_code_heavy(self, text: str) -> bool:
        """Check if text is code-heavy."""
        # Simple heuristics for code detection
        code_indicators = [
            r'\{.*\}',  # Braces
            r'\[.*\]',  # Brackets
            r'\(.*\)',  # Parentheses
            r'def\s+\w+',  # Function definitions
            r'class\s+\w+',  # Class definitions
            r'import\s+\w+',  # Imports
            r'console\.log',  # Console logs
            r'print\(',  # Print statements
            r'return\s+',  # Return statements
        ]
        
        matches = 0
        for pattern in code_indicators:
            if re.search(pattern, text):
                matches += 1
        
        # If more than 2 code indicators, consider it code-heavy
        return matches > 2
    
    def _is_natural_language(self, text: str) -> bool:
        """Check if text is natural language."""
        # Simple heuristics for natural language
        sentences = re.split(r'[.!?]+', text)
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        
        # Natural language typically has sentences of 10-25 words
        return 5 < avg_sentence_length < 50
    
    def batch_count(
        self,
        texts: List[Union[str, List[Dict[str, str]]]],
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> List[TokenCount]:
        """
        Count tokens for multiple texts in batch.
        
        Args:
            texts: List of texts or message lists
            model: Model name
            provider: Provider name
            
        Returns:
            List of token counts
        """
        return [
            self.count_tokens(text, model, provider)
            for text in texts
        ]
    
    def get_supported_models(self) -> Dict[str, List[str]]:
        """Get list of supported models by provider."""
        return {
            "openai": list(self.TIKTOKEN_MODELS.keys()),
            "claude": ["claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
            "gemini": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
        }
    
    def validate_token_count(
        self,
        text: Union[str, List[Dict[str, str]]],
        expected_tokens: int,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        tolerance: float = 0.1
    ) -> Dict[str, Any]:
        """
        Validate token count against expected value.
        
        Args:
            text: Text to count
            expected_tokens: Expected token count
            model: Model name
            provider: Provider name
            tolerance: Acceptable difference as percentage
            
        Returns:
            Validation result
        """
        result = self.count_tokens(text, model, provider)
        
        difference = abs(result.tokens - expected_tokens)
        percentage_diff = difference / expected_tokens if expected_tokens > 0 else 0
        
        is_valid = percentage_diff <= tolerance
        
        return {
            "valid": is_valid,
            "expected": expected_tokens,
            "actual": result.tokens,
            "difference": difference,
            "percentage_difference": percentage_diff,
            "tolerance": tolerance,
            "method": result.method.value,
            "confidence": result.confidence
        }


# Global token counter instance
_token_counter: Optional[TokenCounter] = None


def get_token_counter() -> TokenCounter:
    """Get the global token counter instance."""
    global _token_counter
    if _token_counter is None:
        _token_counter = TokenCounter()
    return _token_counter


def estimate_tokens(
    text: Union[str, List[Dict[str, str]]],
    model: Optional[str] = None,
    provider: Optional[str] = None
) -> int:
    """
    Quick function to estimate token count.
    
    Args:
        text: Text or messages to count
        model: Model name
        provider: Provider name
        
    Returns:
        Estimated token count
    """
    counter = get_token_counter()
    result = counter.count_tokens(text, model, provider)
    return result.tokens 