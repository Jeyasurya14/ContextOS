# Entry point for uvicorn when using "main:app"
from app.main import app as app

__all__ = ["app"]
