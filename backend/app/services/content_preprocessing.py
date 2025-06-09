"""
Document content preprocessing and cleaning service.

This module provides advanced text preprocessing, cleaning, and normalization
for documents before chunking and indexing.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import unicodedata
from html import unescape

from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class PreprocessingResult: 