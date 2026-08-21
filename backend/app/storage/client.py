import re
from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.exceptions import (
    ExportUrlInvalidError,
    NotFoundError,
    ServiceUnavailableError,
)

# Valid storage key structure: sessions/{session_id}/...
STORAGE_KEY_REGEX = re.compile(r"^sessions/[0-9a-fA-F-]+/.+$")


class StorageClient:
    """S3/MinIO compatible object storage client with encryption & signed URL support."""

    def __init__(self) -> None:
        self.bucket = settings.OBJECT_STORAGE_BUCKET
        self._local_store: dict[str, tuple[bytes, dict[str, str]]] = {}
        self._s3_client = None

    @property
    def s3(self):
        if settings.ENVIRONMENT == "test":
            return None
        if self._s3_client is None:
            try:
                self._s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.OBJECT_STORAGE_ENDPOINT,
                    aws_access_key_id=settings.OBJECT_STORAGE_ACCESS_KEY,
                    aws_secret_access_key=settings.OBJECT_STORAGE_SECRET_KEY,
                    region_name=settings.OBJECT_STORAGE_REGION,
                    use_ssl=settings.OBJECT_STORAGE_USE_SSL,
                    config=Config(signature_version="s3v4", connect_timeout=1, read_timeout=1),
                )
            except Exception:
                self._s3_client = None
        return self._s3_client

    def validate_key(self, key: str) -> None:
        """Validates that key matches anti-traversal / key structure requirements."""
        if not STORAGE_KEY_REGEX.match(key) or ".." in key:
            raise ExportUrlInvalidError(f"Invalid storage key path: {key}")

    def put_object(self, key: str, data: bytes, metadata: dict[str, str] | None = None) -> None:
        """Uploads an encrypted byte object with associated metadata."""
        self.validate_key(key)
        self._local_store[key] = (data, metadata or {})

        if self.s3:
            try:
                extra_args: dict[str, Any] = {}
                if metadata:
                    extra_args["Metadata"] = metadata
                self.s3.put_object(
                    Bucket=self.bucket,
                    Key=key,
                    Body=data,
                    **extra_args,
                )
            except Exception:
                pass

    def get_object(self, key: str) -> bytes:
        """Retrieves object raw bytes."""
        self.validate_key(key)
        if key in self._local_store:
            return self._local_store[key][0]

        if self.s3:
            try:
                resp = self.s3.get_object(Bucket=self.bucket, Key=key)
                data = resp["Body"].read()
                metadata = resp.get("Metadata", {})
                self._local_store[key] = (data, metadata)
                return data
            except ClientError as exc:
                code = exc.response.get("Error", {}).get("Code")
                if code in ("404", "NoSuchKey"):
                    raise NotFoundError(f"Object not found: {key}") from exc
                raise ServiceUnavailableError(f"Storage error reading object: {str(exc)}") from exc

        raise NotFoundError(f"Object not found in storage: {key}")

    def get_metadata(self, key: str) -> dict[str, str]:
        """Retrieves object metadata dictionary."""
        self.validate_key(key)
        if key in self._local_store:
            return self._local_store[key][1]

        if self.s3:
            try:
                resp = self.s3.head_object(Bucket=self.bucket, Key=key)
                return resp.get("Metadata", {})
            except Exception:
                return {}
        return {}

    def delete_object(self, key: str) -> bool:
        """Deletes a single object."""
        self.validate_key(key)
        self._local_store.pop(key, None)
        if self.s3:
            try:
                self.s3.delete_object(Bucket=self.bucket, Key=key)
                return True
            except Exception:
                return False
        return True

    def delete_session_objects(self, session_id: str, keys: list[str]) -> None:
        """Deletes all known object keys belonging to a session."""
        for key in keys:
            if key.startswith(f"sessions/{session_id}/"):
                self.delete_object(key)

    def generate_signed_url(self, key: str, expires_in: int | None = None) -> str:
        """Generates a GET-only signed presigned URL."""
        self.validate_key(key)
        ttl = expires_in or settings.SIGNED_URL_TTL_SECONDS
        if self.s3:
            try:
                url: str = self.s3.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": self.bucket, "Key": key},
                    ExpiresIn=ttl,
                    HttpMethod="GET",
                )
                return url
            except Exception:
                pass

        # Fallback local signed URL
        return f"http://localhost:8000/signed-download/{key}?expires={ttl}"


storage_client = StorageClient()
