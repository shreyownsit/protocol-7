import json
from typing import TypeVar

from pydantic import BaseModel

from app.core.config import settings
from app.core.exceptions import AIOutputInvalidError, AIProviderUnavailableError

T = TypeVar("T", bound=BaseModel)


class LLMClient:
    """Claude Anthropic API wrapper with structured JSON output validation and test mocks."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.CLAUDE_API_KEY
        self.model = settings.CLAUDE_MODEL

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        system_prompt: str | None = None,
        max_retries: int = 2,
    ) -> T:
        """Generates structured response adhering to the given Pydantic model."""
        # When no API key is configured (local testing / offline CI), use deterministic mock generator
        if not self.api_key:
            return self._generate_mock_response(response_model, prompt)

        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=self.api_key, base_url=settings.CLAUDE_BASE_URL)
            for attempt in range(max_retries + 1):
                try:
                    schema_json = json.dumps(response_model.model_json_schema())
                    sys_msg = (system_prompt or "") + f"\nYou MUST output valid JSON matching this schema:\n{schema_json}"

                    response = await client.messages.create(
                        model=self.model,
                        max_tokens=2048,
                        temperature=0.2,
                        system=sys_msg,
                        messages=[{"role": "user", "content": prompt}],
                    )

                    text_content = response.content[0].text if response.content else "{}"
                    # Strip markdown fence if present
                    if "```json" in text_content:
                        text_content = text_content.split("```json")[1].split("```")[0].strip()
                    elif "```" in text_content:
                        text_content = text_content.split("```")[1].split("```")[0].strip()

                    parsed_data = json.loads(text_content)
                    return response_model.model_validate(parsed_data)
                except Exception:
                    if attempt == max_retries:
                        raise
            raise AIOutputInvalidError(f"Failed to obtain valid structured output for {response_model.__name__}")
        except AIOutputInvalidError:
            raise
        except Exception as exc:
            raise AIProviderUnavailableError(f"AI Provider error: {str(exc)}") from exc

    def _generate_mock_response(self, response_model: type[T], prompt: str) -> T:
        """Generates deterministic mock responses for offline testing."""
        name = response_model.__name__

        if name == "SummaryOutput":
            data = {
                "summary": "This is a synthetic contract agreement between the parties setting forth mutual obligations, payment schedules, and termination conditions.",
                "reading_level": "simple",
                "key_parties": ["Landlord", "Tenant"],
            }
            return response_model.model_validate(data)

        if name == "FlagListOutput":
            data = {
                "flags": [
                    {
                        "clause_id": "mock-clause-1",
                        "page": 1,
                        "category": "ambiguity",
                        "severity": "medium",
                        "rationale": "Late fee calculation basis contains potential ambiguity.",
                    }
                ]
            }
            return response_model.model_validate(data)

        if name == "ProsecutorOutput":
            data = {
                "issues": [
                    {
                        "category": "one_sided",
                        "fragment_quote": "fails to pay rent by the 5th day",
                        "severity": "high",
                        "explanation": "Daily late penalty exceeds standard statutory reasonableness thresholds.",
                    }
                ]
            }
            return response_model.model_validate(data)

        if name == "DefenseOutput":
            data = {
                "counter_text": "If Tenant fails to pay rent within a 5-day grace period, a reasonable late fee capped at $50 per occurrence shall apply.",
                "rationale": "Introduces a standard 5-day grace period and caps the penalty.",
                "changes": [
                    {"kind": "modified", "fragment": "added 5-day grace period and $50 cap"}
                ],
            }
            return response_model.model_validate(data)

        # Fallback default instantiation
        return response_model.model_validate({})


llm_client = LLMClient()
