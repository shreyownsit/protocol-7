import pytest

from app.core.exceptions import (
    AuthPasswordTooWeakError,
    AuthTokenInvalidError,
    StorageDecryptionError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.storage.crypto import (
    decrypt_data,
    encrypt_data,
    generate_document_key,
    unwrap_document_key,
    wrap_document_key,
)


def test_password_hashing_and_verification():
    password = "CorrectHorseBatteryStaple123!"
    validate_password_strength(password)
    hashed = hash_password(password)

    assert hashed.startswith("$argon2id$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_password_strength_enforcement():
    with pytest.raises(AuthPasswordTooWeakError):
        validate_password_strength("short1A")  # < 12 chars

    with pytest.raises(AuthPasswordTooWeakError):
        validate_password_strength("alllowercaselettersnohere")  # no digit

    with pytest.raises(AuthPasswordTooWeakError):
        validate_password_strength("1234567890123456")  # no letters


def test_jwt_token_roundtrip():
    user_id = "user-123"
    email = "test@example.com"
    token = create_access_token(user_id, email)

    payload = decode_jwt_token(token, expected_type="access")
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["type"] == "access"


def test_aes_gcm_encryption_and_aad_binding():
    data = b"Confidential Legal Agreement Text"
    session_id = "session-test-uuid"
    artifact_id = "doc-test-uuid"

    data_key = generate_document_key()
    assert len(data_key) == 32

    # Encrypt
    encrypted_blob = encrypt_data(data, data_key, session_id, "document", artifact_id)
    assert encrypted_blob != data

    # Decrypt with correct AAD
    decrypted = decrypt_data(encrypted_blob, data_key, session_id, "document", artifact_id)
    assert decrypted == data

    # Decrypt with wrong AAD (session_id mismatch) -> MUST raise StorageDecryptionError
    with pytest.raises(StorageDecryptionError):
        decrypt_data(encrypted_blob, data_key, "wrong-session-id", "document", artifact_id)


def test_key_wrapping_and_unwrapping():
    session_id = "sess-abc"
    doc_key = generate_document_key()

    wrapped_b64 = wrap_document_key(doc_key, session_id)
    assert isinstance(wrapped_b64, str)

    unwrapped_key = unwrap_document_key(wrapped_b64, session_id)
    assert unwrapped_key == doc_key

    with pytest.raises(StorageDecryptionError):
        unwrap_document_key(wrapped_b64, "different-session")
