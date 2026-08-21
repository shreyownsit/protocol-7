import re
from typing import Any

from app.core.exceptions import ComplianceFailedError


class RuleEngineContext:
    """Evaluation context bound to a specific clause, session, and extracted variables."""

    def __init__(
        self,
        jurisdiction: str,
        agreement_type: str,
        clause_type: str,
        clause_text: str,
        variables: dict[str, float] | None = None,
    ) -> None:
        self.jurisdiction = jurisdiction
        self.agreement_type = agreement_type
        self.clause_type = clause_type
        self.clause_text = clause_text
        self.variables = variables or {}

    def extract_money(self) -> float:
        """Extracts first dollar/currency amount found in clause text."""
        # Matches $1,800, $50.00, $500, USD 1000
        match = re.search(r"\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)", self.clause_text)
        if match:
            raw = match.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                pass
        match_usd = re.search(r"(\b[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*(?:USD|dollars)", self.clause_text, re.IGNORECASE)
        if match_usd:
            raw = match_usd.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                pass
        return 0.0

    def has_number(self, *keywords: str) -> bool:
        """Checks if clause contains numbers and any of the given keywords."""
        has_digit = bool(re.search(r"\d", self.clause_text))
        if not has_digit:
            return False
        if not keywords:
            return True
        text_lower = self.clause_text.lower()
        return any(kw.lower() in text_lower for kw in keywords)

    def extract_variable(self, name: str) -> float | None:
        """Retrieves a numeric variable from the bound variables map."""
        return self.variables.get(name)

    def text_matches(self, pattern: str) -> bool:
        """Evaluates a regular expression against clause text."""
        try:
            return bool(re.search(pattern, self.clause_text, re.IGNORECASE))
        except re.error:
            return False


class RuleEngine:
    """Constrained recursive-descent expression evaluator (NO raw eval)."""

    def __init__(self, max_depth: int = 20, max_steps: int = 500) -> None:
        self.max_depth = max_depth
        self.max_steps = max_steps

    def evaluate_condition(self, expr_str: str, ctx: RuleEngineContext) -> tuple[str, dict[str, Any]]:
        """Evaluates condition expression.

        Returns: (outcome, details)
        where outcome is 'violation', 'satisfied', 'not_applicable', or 'insufficient_data'.
        """
        expr_clean = expr_str.strip()
        if not expr_clean:
            return "not_applicable", {}

        # Normalize line breaks and spaces
        lines = [line.strip() for line in expr_clean.splitlines() if line.strip()]
        joined_expr = " ".join(lines)

        try:
            val = self._eval_or(joined_expr, ctx, depth=0, step_count=[0])
            if val is None:
                return "insufficient_data", {"reason": "Missing required variable"}
            outcome = "violation" if val else "satisfied"
            return outcome, {"evaluated": val}
        except Exception as exc:
            return "not_applicable", {"error": str(exc)}

    def _eval_or(self, s: str, ctx: RuleEngineContext, depth: int, step_count: list[int]) -> bool | None:
        parts = [p.strip() for p in re.split(r"\bor\b", s, flags=re.IGNORECASE)]
        results = [self._eval_and(p, ctx, depth + 1, step_count) for p in parts]
        if any(r is True for r in results):
            return True
        if any(r is None for r in results):
            return None
        return False

    def _eval_and(self, s: str, ctx: RuleEngineContext, depth: int, step_count: list[int]) -> bool | None:
        parts = [p.strip() for p in re.split(r"\band\b", s, flags=re.IGNORECASE)]
        results = [self._eval_atom(p, ctx, depth + 1, step_count) for p in parts]
        if any(r is False for r in results):
            return False
        if any(r is None for r in results):
            return None
        return True

    def _eval_atom(self, s: str, ctx: RuleEngineContext, depth: int, step_count: list[int]) -> bool | None:
        step_count[0] += 1
        if step_count[0] > self.max_steps:
            raise ComplianceFailedError("Evaluation step limit exceeded.")
        if depth > self.max_depth:
            raise ComplianceFailedError("Evaluation recursion depth exceeded.")

        s = s.strip()

        # Handle negation: not <expr>
        if s.lower().startswith("not "):
            inner = self._eval_atom(s[4:].strip(), ctx, depth + 1, step_count)
            return not inner if inner is not None else None

        # Handle parentheses
        if s.startswith("(") and s.endswith(")"):
            return self._eval_or(s[1:-1], ctx, depth + 1, step_count)

        # Handle comparison: ==, !=, >=, <=, >, <
        comp_match = re.search(r"(==|!=|>=|<=|>|<)", s)
        if comp_match:
            op = comp_match.group(1)
            left_str = s[: comp_match.start()].strip()
            right_str = s[comp_match.end() :].strip()

            left_val = self._resolve_val(left_str, ctx)
            right_val = self._resolve_val(right_str, ctx)

            if left_val is None or right_val is None:
                return None

            if op == "==":
                return str(left_val).lower() == str(right_val).lower()
            if op == "!=":
                return str(left_val).lower() != str(right_val).lower()
            try:
                lf, rf = float(left_val), float(right_val)
                if op == ">":
                    return lf > rf
                if op == ">=":
                    return lf >= rf
                if op == "<":
                    return lf < rf
                if op == "<=":
                    return lf <= rf
            except (ValueError, TypeError):
                return False

        # Handle predicate methods
        if "clause.has_number(" in s:
            match = re.search(r"clause\.has_number\((.*?)\)", s)
            if match:
                args = [a.strip().strip("'\"") for a in match.group(1).split(",") if a.strip()]
                return ctx.has_number(*args)

        if "text_matches(" in s:
            match = re.search(r"text_matches\((.*?)\)", s)
            if match:
                pattern = match.group(1).strip().strip("'\"")
                return ctx.text_matches(pattern)

        return False

    def _resolve_val(self, s: str, ctx: RuleEngineContext) -> Any:
        s = s.strip()

        # Check string literals
        if (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')):
            return s[1:-1]

        # Check variable expressions like: 2 * extract_variable("monthly_rent")
        mult_match = re.search(r"([0-9.]+)\s*\*\s*extract_variable\((['\"].*?['\"])\)", s)
        if mult_match:
            factor = float(mult_match.group(1))
            var_name = mult_match.group(2).strip("'\"")
            val = ctx.extract_variable(var_name)
            return factor * val if val is not None else None

        if "extract_variable(" in s:
            match = re.search(r"extract_variable\((['\"].*?['\"])\)", s)
            if match:
                var_name = match.group(1).strip("'\"")
                return ctx.extract_variable(var_name)

        if s == "clause.extract_money()":
            return ctx.extract_money()

        if s == "jurisdiction":
            return ctx.jurisdiction

        if s == "agreement_type":
            return ctx.agreement_type

        if s == "clause.clause_type":
            return ctx.clause_type

        # Numeric literal
        try:
            return float(s)
        except ValueError:
            return s


rule_engine = RuleEngine()
