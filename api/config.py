import os


def public_config():
    return {
        "app": {
            "name": "VisePanda",
            "domain": "go2china.space",
            "version": "6.0.4",
            "environment": os.environ.get("VERCEL_ENV") or os.environ.get("ENVIRONMENT", "local"),
        },
        "features": {
            "auth": True,
            "trips": True,
            "chat": True,
            "visa": True,
            "admin": True,
        },
        "ai": {
            "provider": "deepseek" if os.environ.get("DEEPSEEK_API_KEY") else "local-guide",
            "streaming": True,
        },
    }
