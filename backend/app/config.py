import os
from dataclasses import dataclass, field
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:  # optional
    pass


@dataclass
class Settings:
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    claude_model: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
    db_path: str = os.getenv("DB_PATH", str(Path(__file__).resolve().parent.parent / "var" / "coldbrew.sqlite3"))
    cors_origins: list = field(default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","))
    data_file: str = str(Path(__file__).resolve().parent / "data" / "public_data.json")


settings = Settings()
