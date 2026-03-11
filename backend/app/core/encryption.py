# backend/app/core/encryption.py

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from loguru import logger

from app.core.config import settings


def _get_key() -> bytes:
    """Derive a 32-byte key from the configured encryption key."""
    key_bytes = settings.ENCRYPTION_KEY.encode("utf-8")
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b"\0")
    return key_bytes[:32]


def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext string using AES-256-GCM.

    Returns a base64-encoded string containing nonce + ciphertext + tag.
    """
    if not plaintext:
        logger.warning("Attempted to encrypt empty string")
        return ""

    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    encrypted = base64.b64encode(nonce + ciphertext).decode("utf-8")
    return encrypted


def decrypt_token(encrypted: str) -> str:
    """Decrypt an AES-256-GCM encrypted token.

    Expects a base64-encoded string containing nonce + ciphertext + tag.
    """
    if not encrypted:
        logger.warning("Attempted to decrypt empty string")
        return ""

    try:
        key = _get_key()
        aesgcm = AESGCM(key)
        raw = base64.b64decode(encrypted)
        nonce = raw[:12]
        ciphertext = raw[12:]
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode("utf-8")
    except Exception as e:
        logger.error("Token decryption failed for user data: {}", type(e).__name__)
        raise ValueError("Failed to decrypt token") from e
