from typing import Any


class TypedAppError(Exception):
    """Base typed application error corresponding to the canonical error taxonomy."""

    code: str = "INTERNAL_ERROR"
    status_code: int = 500
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        details: list[dict[str, Any]] | None = None,
        code: str | None = None,
        status_code: int | None = None,
    ) -> None:
        if message:
            self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details or []
        super().__init__(self.message)


# Authentication & Authorization
class AuthInvalidCredentialsError(TypedAppError):
    code = "AUTH_INVALID_CREDENTIALS"
    status_code = 401
    message = "Invalid email or password."


class AuthUnauthorizedError(TypedAppError):
    code = "AUTH_UNAUTHORIZED"
    status_code = 403
    message = "You are not authorized to access this resource."


class AuthTokenExpiredError(TypedAppError):
    code = "AUTH_TOKEN_EXPIRED"
    status_code = 401
    message = "Authentication token has expired."


class AuthTokenInvalidError(TypedAppError):
    code = "AUTH_TOKEN_INVALID"
    status_code = 401
    message = "Authentication token is invalid or has been revoked."


class AuthEmailNotVerifiedError(TypedAppError):
    code = "AUTH_EMAIL_NOT_VERIFIED"
    status_code = 403
    message = "Email address has not been verified."


class AuthPasswordTooWeakError(TypedAppError):
    code = "AUTH_PASSWORD_TOO_WEAK"
    status_code = 422
    message = "Password does not meet minimum complexity requirements."


class AuthRateLimitedError(TypedAppError):
    code = "AUTH_RATE_LIMITED"
    status_code = 429
    message = "Too many login attempts. Please try again later."


class AuthAccountLockedError(TypedAppError):
    code = "AUTH_ACCOUNT_LOCKED"
    status_code = 423
    message = "Account is temporarily locked due to excessive failed login attempts."


# Sessions
class SessionNotFoundError(TypedAppError):
    code = "SESSION_NOT_FOUND"
    status_code = 404
    message = "Session not found."


class SessionExpiredError(TypedAppError):
    code = "SESSION_EXPIRED"
    status_code = 410
    message = "Your analysis session has expired."


class SessionNotActiveError(TypedAppError):
    code = "SESSION_NOT_ACTIVE"
    status_code = 409
    message = "Session is not active."


class SessionSaveFailedError(TypedAppError):
    code = "SESSION_SAVE_FAILED"
    status_code = 422
    message = "Failed to save the session."


# Documents & Ingestion
class DocumentInvalidError(TypedAppError):
    code = "DOCUMENT_INVALID"
    status_code = 422
    message = "Document format or content is invalid."


class DocumentTooLargeError(TypedAppError):
    code = "DOCUMENT_TOO_LARGE"
    status_code = 413
    message = "Document exceeds the maximum permitted file size."


class DocumentUnsupportedError(TypedAppError):
    code = "DOCUMENT_UNSUPPORTED"
    status_code = 415
    message = "Document MIME type is not supported."


class DocumentMaliciousError(TypedAppError):
    code = "DOCUMENT_MALICIOUS"
    status_code = 422
    message = "Document failed security scanning heuristics."


class DocumentNotFoundError(TypedAppError):
    code = "DOCUMENT_NOT_FOUND"
    status_code = 404
    message = "Document not found."


class DocumentAlreadyProcessedError(TypedAppError):
    code = "DOCUMENT_ALREADY_PROCESSED"
    status_code = 409
    message = "An identical document has already been processed in this session."


class DocumentParseEmptyError(TypedAppError):
    code = "DOCUMENT_PARSE_EMPTY"
    status_code = 422
    message = "Parsed document contains no extractable text."


# Processing Pipeline
class OCRFailedError(TypedAppError):
    code = "OCR_FAILED"
    status_code = 500
    message = "Optical character recognition failed."


class ParserFailedError(TypedAppError):
    code = "PARSER_FAILED"
    status_code = 500
    message = "Failed to construct the structural document AST."


class DiffFailedError(TypedAppError):
    code = "DIFF_FAILED"
    status_code = 500
    message = "Failed to align and compute document diff."


class ComplianceFailedError(TypedAppError):
    code = "COMPLIANCE_FAILED"
    status_code = 500
    message = "Deterministic compliance evaluation failed."


class GraphFailedError(TypedAppError):
    code = "GRAPH_FAILED"
    status_code = 500
    message = "Knowledge graph construction failed."


class SimulationInvalidError(TypedAppError):
    code = "SIMULATION_INVALID"
    status_code = 422
    message = "Simulation variables or formulas are invalid."


class AnalysisPipelineFailedError(TypedAppError):
    code = "ANALYSIS_PIPELINE_FAILED"
    status_code = 500
    message = "Analysis pipeline processing failed."


class AIOutputInvalidError(TypedAppError):
    code = "AI_OUTPUT_INVALID"
    status_code = 424
    message = "AI response failed structured schema validation."


class AIProviderUnavailableError(TypedAppError):
    code = "AI_PROVIDER_UNAVAILABLE"
    status_code = 503
    message = "AI service provider is currently unavailable."


# Negotiation, Audio, Export
class NegotiationFailedError(TypedAppError):
    code = "NEGOTIATION_FAILED"
    status_code = 500
    message = "Negotiation orchestration failed."


class NegotiationInProgressError(TypedAppError):
    code = "NEGOTIATION_IN_PROGRESS"
    status_code = 409
    message = "A negotiation is already active for this clause."


class NegotiationNotStartedError(TypedAppError):
    code = "NEGOTIATION_NOT_STARTED"
    status_code = 404
    message = "No active negotiation found."


class AudioFailedError(TypedAppError):
    code = "AUDIO_FAILED"
    status_code = 500
    message = "Audio narration synthesis failed."


class AudioLanguageUnsupportedError(TypedAppError):
    code = "AUDIO_LANGUAGE_UNSUPPORTED"
    status_code = 422
    message = "Requested narration language is not supported."


class ExportFailedError(TypedAppError):
    code = "EXPORT_FAILED"
    status_code = 500
    message = "Export generation failed."


class ExportTypeUnsupportedError(TypedAppError):
    code = "EXPORT_TYPE_UNSUPPORTED"
    status_code = 422
    message = "Requested export format is not supported."


class ExportUrlExpiredError(TypedAppError):
    code = "EXPORT_URL_EXPIRED"
    status_code = 410
    message = "Export download URL has expired."


class ExportUrlInvalidError(TypedAppError):
    code = "EXPORT_URL_INVALID"
    status_code = 403
    message = "Export download URL signature is invalid."


# General & Infrastructure
class RateLimitedError(TypedAppError):
    code = "RATE_LIMITED"
    status_code = 429
    message = "Too many requests. Please slow down."


class ValidationError(TypedAppError):
    code = "VALIDATION_ERROR"
    status_code = 422
    message = "Request validation failed."


class NotFoundError(TypedAppError):
    code = "NOT_FOUND"
    status_code = 404
    message = "Requested resource was not found."


class InternalError(TypedAppError):
    code = "INTERNAL_ERROR"
    status_code = 500
    message = "An internal server error occurred."


class ServiceUnavailableError(TypedAppError):
    code = "SERVICE_UNAVAILABLE"
    status_code = 503
    message = "A required service or dependency is unavailable."


class StorageDecryptionError(TypedAppError):
    code = "STORAGE_DECRYPTION_ERROR"
    status_code = 500
    message = "Failed to decrypt encrypted payload."


class StorageEncryptionError(TypedAppError):
    code = "STORAGE_ENCRYPTION_ERROR"
    status_code = 500
    message = "Failed to encrypt payload."


class StorageObjectNotFoundError(TypedAppError):
    code = "STORAGE_OBJECT_NOT_FOUND"
    status_code = 404
    message = "Object not found in storage."

