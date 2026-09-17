"""Environment parsing shared by service settings."""

import os


def env_int(name: str, default: int) -> int:
    """Use the default for unset, blank or invalid integer settings."""
    try:
        return int(os.getenv(name, ""))
    except ValueError:
        return default
