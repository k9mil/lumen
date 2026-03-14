"""Core types and protocols for Lumen agents."""

from dataclasses import dataclass, field
from typing import Any, Generic, Protocol, TypeVar
from datetime import datetime

T = TypeVar("T")


@dataclass(frozen=True)
class Result(Generic[T]):
    """Standard result type for all agent operations.

    Attributes:
        success: Whether the operation succeeded
        data: The result data (None if failed)
        error: Error message (None if succeeded)
        metadata: Additional context (timing, retries, source)
    """

    success: bool
    data: T | None = None
    error: str | None = None
    metadata: dict = field(default_factory=dict)

    @classmethod
    def ok(cls, data: T, **metadata) -> "Result[T]":
        """Create successful result."""
        return cls(success=True, data=data, error=None, metadata=metadata)

    @classmethod
    def fail(cls, error: str, **metadata) -> "Result[T]":
        """Create failed result."""
        return cls(success=False, data=None, error=error, metadata=metadata)

    def with_timing(self, start_time: datetime, end_time: datetime) -> "Result[T]":
        """Add timing metadata."""
        duration_ms = (end_time - start_time).total_seconds() * 1000
        new_metadata = {**self.metadata, "duration_ms": round(duration_ms, 2)}
        return Result(success=self.success, data=self.data, error=self.error, metadata=new_metadata)


@dataclass(frozen=True)
class AgentConfig:
    """Configuration passed to agents."""

    timeout_seconds: float = 10.0
    max_retries: int = 2

    # API Keys (agents pick what they need)
    google_api_key: str = ""
    companies_house_api_key: str = ""
    gemini_api_key: str = ""


class Agent(Protocol):
    """Protocol all agents must implement."""

    name: str

    async def execute(self, input_data: dict[str, Any]) -> Result[dict[str, Any]]:
        """Execute the agent's main function.

        Args:
            input_data: Agent-specific input parameters

        Returns:
            Result containing output data or error
        """
        ...

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Validate input data before execution.

        Returns:
            (is_valid, error_message)
        """
        ...


class BaseAgent:
    """Base class providing common agent functionality."""

    name: str = "base"

    def __init__(self, config: AgentConfig):
        self.config = config

    def validate_input(self, data: dict[str, Any]) -> tuple[bool, str]:
        """Override in subclasses for specific validation."""
        return True, ""

    def _requires_key(self, key_name: str, key_value: str) -> Result[None]:
        """Check if required API key is present."""
        if not key_value:
            return Result.fail(f"Missing required API key: {key_name}")
        return Result.ok(None)
