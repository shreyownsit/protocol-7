import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.core.config import settings
from app.core.exceptions import StorageDecryptionError, StorageEncryptionError


def derive_session_wrapping_key(session_id: str) -> bytes:
    """Derives a per-session 256-bit wrapping key from master ENCRYPTION_KEY using HKDF."""
    master_key_bytes = bytes.fromhex(settings.ENCRYPTION_KEY)
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=session_id.encode("utf-8"),
        info=b"lexiclear-session-wrap",
    )
    return hkdf.derive(master_key_bytes)


def generate_document_key() -> bytes:
    """Generates a random 256-bit (32 bytes) AES key for document encryption."""
    return AESGCM.generate_key(bit_length=256)


def wrap_document_key(data_key: bytes, session_id: str) -> str:
    """Wraps the data key using the session wrapping key and returns a base64 string."""
    try:
        wrapping_key = derive_session_wrapping_key(session_id)
        aesgcm = AESGCM(wrapping_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data_key, associated_data=session_id.encode("utf-8"))
        return base64.b64encode(nonce + ciphertext).decode("utf-8")
    except Exception as exc:
        raise StorageEncryptionError("Failed to wrap document key.") from exc


def unwrap_document_key(wrapped_key_b64: str, session_id: str) -> bytes:
    """Unwraps a base64 wrapped data key using the session wrapping key."""
    try:
        raw = base64.b64decode(wrapped_key_b64.encode("utf-8"))
        nonce = raw[:12]
        ciphertext = raw[12:]
        wrapping_key = derive_session_wrapping_key(session_id)
        aesgcm = AESGCM(wrapping_key)
        return aesgcm.decrypt(nonce, ciphertext, associated_data=session_id.encode("utf-8"))
    except Exception as exc:
        raise StorageDecryptionError("Failed to decrypt wrapped document key.") from exc


def encrypt_data(
    data: bytes,
    data_key: bytes,
    session_id: str,
    artifact_type: str,
    artifact_id: str,
) -> bytes:
    """Encrypts plaintext data using AES-256-GCM with associated data binding.

    Returns: nonce (12 bytes) + ciphertext_with_tag.
    """
    try:
        aad = f"{session_id}:{artifact_type}:{artifact_id}".encode()
        aesgcm = AESGCM(data_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data, associated_data=aad)
        return nonce + ciphertext
    except Exception as exc:
        raise StorageEncryptionError("Failed to encrypt document payload.") from exc


def decrypt_data(
    encrypted_blob: bytes,
    data_key: bytes,
    session_id: str,
    artifact_type: str,
    artifact_id: str,
) -> bytes:
    """Decrypts AES-256-GCM encrypted blob with authenticated data verification."""
    if len(encrypted_blob) < 28:  # 12-byte nonce + 16-byte tag minimum
        raise StorageDecryptionError("Encrypted payload is malformed or corrupted.")

    nonce = encrypted_blob[:12]
    ciphertext = encrypted_blob[12:]
    aad = f"{session_id}:{artifact_type}:{artifact_id}".encode()
    aesgcm = AESGCM(data_key)

    try:
        return aesgcm.decrypt(nonce, ciphertext, associated_data=aad)
    except Exception as exc:
        raise StorageDecryptionError("Decryption failed: authentication tag mismatch or corrupted data.") from exc
