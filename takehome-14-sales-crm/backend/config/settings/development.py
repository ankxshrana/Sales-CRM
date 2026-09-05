"""Development settings for Sales CRM backend."""
import os
from .base import *  # noqa: F403

DEBUG = True

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")

# Database setup
# Uses PostgreSQL if DATABASE_URL or POSTGRES_DB environment variable is provided,
# otherwise falls back to local SQLite for rapid zero-dependency development.
db_url = os.environ.get("DATABASE_URL")

if db_url:
    import urllib.parse
    parsed = urllib.parse.urlparse(db_url)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "localhost",
            "PORT": parsed.port or "5432",
        }
    }
elif os.environ.get("POSTGRES_DB") and os.environ.get("USE_POSTGRES", "False").lower() in ("true", "1"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "sales_crm"),
            "USER": os.environ.get("POSTGRES_USER", "crm_user"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "crm_secret"),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
        }
    }

ALLOWED_HOSTS = ["*"]

# CORS configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
