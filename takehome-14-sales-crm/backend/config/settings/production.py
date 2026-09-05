"""Production settings for Sales CRM backend."""
import os
import urllib.parse
from .base import *  # noqa: F403

DEBUG = False

SECRET_KEY = os.environ.get("SECRET_KEY", "crm-production-fallback-secret-key-change-me")

# Host configuration
raw_hosts = os.environ.get("ALLOWED_HOSTS", "")
ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(",") if h.strip()]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = [".onrender.com", "localhost", "127.0.0.1"]

# Automatically allow Render external hostname if detected
render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

# PostgreSQL Database
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    parsed = urllib.parse.urlparse(DATABASE_URL)
    query_params = urllib.parse.parse_qs(parsed.query)
    options = {}
    if "sslmode" in query_params:
        options["sslmode"] = query_params["sslmode"][0]
    elif parsed.hostname and ("neon.tech" in parsed.hostname or "render.com" in parsed.hostname or "supabase.co" in parsed.hostname):
        options["sslmode"] = "require"

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": urllib.parse.unquote(parsed.username or ""),
            "PASSWORD": urllib.parse.unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": parsed.port or "5432",
            "OPTIONS": options,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "sales_crm"),
            "USER": os.environ.get("POSTGRES_USER", "crm_user"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }

# WhiteNoise production configuration
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Security settings
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# CORS configuration
raw_cors = os.environ.get("CORS_ALLOWED_ORIGINS", "")
configured_origins = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]

default_origins = [
    "https://busy-infotech.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

CORS_ALLOWED_ORIGINS = list(dict.fromkeys(configured_origins + default_origins))
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
    r"^https://.*\.onrender\.com$",
]
CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]
for origin in CORS_ALLOWED_ORIGINS:
    if origin.startswith("http") and origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)
