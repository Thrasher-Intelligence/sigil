from __future__ import annotations
import os
from typing import Literal, List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, ValidationInfo

# Allowed precision choices for models
PrecisionType = Literal["fp32", "fp16"]


class Settings(BaseSettings):
    """Central application settings.

    Values can be overridden via environment variables or a .env file located
    in the same directory. All env vars are expected to be prefixed with
    ``SIGIL_`` (e.g. ``SIGIL_MODEL_PRECISION=fp16``) to avoid clashes with
    system-level variables.
    """

    # --- Core ---
    model_precision: PrecisionType = "fp32"
    log_level: str = "INFO"

    # --- Model paths & behaviour ---
    model_base_directory: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "models")
    )
    default_model_path: Optional[str] = None  # e.g. "tinyllama" or an absolute path
    hf_trust_remote_code: bool = False  # Enable with care

    # --- Generation defaults ---
    default_system_prompt: str = "You are a helpful assistant."
    default_temperature: float = 0.7
    default_top_p: float = 0.95
    default_max_new_tokens: int = 1000
    default_repetition_penalty: float = 1.0

    # --- API / Frontend ---
    cors_allowed_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,*"  # Comma-separated list
    )
    frontend_themes_path: str = "frontend/public/themes"

    # ---------------------------------------------------------------------
    # Pydantic-settings configuration
    # ---------------------------------------------------------------------
    model_config = SettingsConfigDict(
        # Use absolute path so it's loaded regardless of CWD
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_prefix="SIGIL_",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    # ------------------------- Helper properties -------------------------
    @property
    def cors_origins_list(self) -> List[str]:
        """Return CORS origins as a list, trimming whitespace."""
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    # -----------------------------------------------------------------
    # Validators
    # -----------------------------------------------------------------
    @field_validator("model_base_directory", mode="before")
    @classmethod
    def _normalize_model_base_dir(cls, v: str | None, info: ValidationInfo) -> str:  # noqa: D401, ANN001
        """Ensure *model_base_directory* is absolute.

        If an environment variable supplies a *relative* path (e.g.
        ``backend/models``), convert it to an absolute path relative to the
        project root (directory containing the *backend* folder).
        """

        if not v:
            # Fall back to default already defined in field declaration
            return v  # type: ignore[return-value]

        v = os.path.expanduser(str(v))  # Expand ~ user home references
        if os.path.isabs(v):
            return os.path.abspath(v)

        # Derive project root (../.. from backend/api/core -> project root)
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        return os.path.abspath(os.path.join(project_root, v))


# Singleton instance to be imported across the codebase
settings = Settings() 