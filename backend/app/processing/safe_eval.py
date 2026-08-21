import re
from typing import Any

from app.core.exceptions import SimulationInvalidError


class SafeMathEvaluator:
    """Client-safe arithmetic expression parser and evaluator (mirrors frontend safeEval.ts)."""

    def __init__(self, max_depth: int = 15) -> None:
        self.max_depth = max_depth

    def evaluate_formula(self, expr_str: str, variables: dict[str, float]) -> float | None:
        """Evaluates an arithmetic expression given a variables dictionary.

        Returns None on division by zero.
        """
        expr_clean = expr_str.strip()
        if not expr_clean:
            return None

        tokens = self._tokenize(expr_clean)
        pos = [0]
        try:
            val = self._parse_expr(tokens, pos, variables, depth=0)
            return round(val, 6) if val is not None else None
        except ZeroDivisionError:
            return None
        except Exception as exc:
            raise SimulationInvalidError(f"Malformed formula '{expr_str}': {str(exc)}") from exc

    def _tokenize(self, s: str) -> list[str]:
        # Tokens: identifiers, numbers, operators +, -, *, /, commas, parens
        token_spec = [
            ("NUMBER", r"-?\d+(?:\.\d+)?"),
            ("FUNC", r"\b(min|max)\b"),
            ("VAR", r"[a-zA-Z_][a-zA-Z0-9_]*"),
            ("OP", r"[+\-*/(),]"),
            ("SKIP", r"[ \t\r\n]+"),
        ]
        tok_regex = "|".join(f"(?P<{pair[0]}>{pair[1]})" for pair in token_spec)
        tokens = []
        for mo in re.finditer(tok_regex, s):
            kind = mo.lastgroup
            val = mo.group()
            if kind == "SKIP":
                continue
            tokens.append(val)
        return tokens

    def _parse_expr(self, tokens: list[str], pos: list[int], variables: dict[str, float], depth: int) -> float | None:
        if depth > self.max_depth:
            raise SimulationInvalidError("Expression recursion depth exceeded.")

        val = self._parse_term(tokens, pos, variables, depth + 1)
        if val is None:
            return None

        while pos[0] < len(tokens) and tokens[pos[0]] in ("+", "-"):
            op = tokens[pos[0]]
            pos[0] += 1
            rhs = self._parse_term(tokens, pos, variables, depth + 1)
            if rhs is None:
                return None
            val = val + rhs if op == "+" else val - rhs
        return val

    def _parse_term(self, tokens: list[str], pos: list[int], variables: dict[str, float], depth: int) -> float | None:
        val = self._parse_factor(tokens, pos, variables, depth + 1)
        if val is None:
            return None

        while pos[0] < len(tokens) and tokens[pos[0]] in ("*", "/"):
            op = tokens[pos[0]]
            pos[0] += 1
            rhs = self._parse_factor(tokens, pos, variables, depth + 1)
            if rhs is None:
                return None
            if op == "*":
                val = val * rhs
            elif op == "/":
                if abs(rhs) < 1e-12:
                    return None
                val = val / rhs
        return val

    def _parse_factor(self, tokens: list[str], pos: list[int], variables: dict[str, float], depth: int) -> float | None:
        if pos[0] >= len(tokens):
            raise SimulationInvalidError("Unexpected end of formula.")

        tok = tokens[pos[0]]

        # Unary minus
        if tok == "-":
            pos[0] += 1
            inner = self._parse_factor(tokens, pos, variables, depth + 1)
            return -inner if inner is not None else None

        # Parenthesized expression
        if tok == "(":
            pos[0] += 1
            val = self._parse_expr(tokens, pos, variables, depth + 1)
            if pos[0] >= len(tokens) or tokens[pos[0]] != ")":
                raise SimulationInvalidError("Unmatched opening parenthesis in formula.")
            pos[0] += 1
            return val

        # Function call: min(...) or max(...)
        if tok in ("min", "max"):
            fn = tok
            pos[0] += 1
            if pos[0] >= len(tokens) or tokens[pos[0]] != "(":
                raise SimulationInvalidError(f"Expected '(' after {fn}.")
            pos[0] += 1

            arg1 = self._parse_expr(tokens, pos, variables, depth + 1)
            if pos[0] >= len(tokens) or tokens[pos[0]] != ",":
                raise SimulationInvalidError(f"Expected ',' separating arguments in {fn}().")
            pos[0] += 1

            arg2 = self._parse_expr(tokens, pos, variables, depth + 1)
            if pos[0] >= len(tokens) or tokens[pos[0]] != ")":
                raise SimulationInvalidError(f"Expected ')' closing {fn}().")
            pos[0] += 1

            if arg1 is None or arg2 is None:
                return None
            return min(arg1, arg2) if fn == "min" else max(arg1, arg2)

        # Number literal
        try:
            num = float(tok)
            pos[0] += 1
            return num
        except ValueError:
            pass

        # Variable identifier
        pos[0] += 1
        if tok not in variables:
            raise SimulationInvalidError(f"Undefined variable '{tok}' in formula.")
        return float(variables[tok])

    def evaluate_model(
        self,
        variables_def: dict[str, Any],
        formulas_def: dict[str, Any],
        scenario_overrides: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """Evaluates full simulation model given variable definitions, formulas, and user overrides."""
        # 1. Resolve effective variable values
        effective_vars: dict[str, float] = {}
        for var_name, var_info in variables_def.items():
            base_val = float(var_info.get("value", 0.0))
            effective_vars[var_name] = base_val

        if scenario_overrides:
            for k, v in scenario_overrides.items():
                if k in variables_def:
                    var_info = variables_def[k]
                    min_val = var_info.get("min", float("-inf"))
                    max_val = var_info.get("max", float("inf"))
                    # Clamp to bounds
                    clamped = max(min_val, min(max_val, float(v)))
                    effective_vars[k] = clamped

        # 2. Check for dependency cycles in formulas (topological sort)
        eval_order = self._resolve_formula_order(formulas_def, set(effective_vars.keys()))

        # 3. Evaluate formulas in order
        formula_results: dict[str, Any] = {}
        computed_env = dict(effective_vars)

        for f_name in eval_order:
            f_info = formulas_def[f_name]
            expr = f_info.get("expr", "")
            unit = f_info.get("unit", "USD")
            label = f_info.get("label", f_name)

            val = self.evaluate_formula(expr, computed_env)
            formula_results[f_name] = {
                "label": label,
                "value": val,
                "unit": unit,
                "matches_reference": True,
            }
            if val is not None:
                computed_env[f_name] = val

        return formula_results

    def _resolve_formula_order(self, formulas_def: dict[str, Any], base_var_names: set[str]) -> list[str]:
        deps: dict[str, set[str]] = {}
        for fname, finfo in formulas_def.items():
            declared_deps = set(finfo.get("depends", []))
            # Formula dependencies on other formulas
            formula_deps = {d for d in declared_deps if d in formulas_def}
            deps[fname] = formula_deps

        resolved: list[str] = []
        visited: set[str] = set()
        visiting: set[str] = set()

        def dfs(node: str) -> None:
            if node in visiting:
                raise SimulationInvalidError(f"Circular dependency detected involving formula '{node}'.")
            if node in visited:
                return
            visiting.add(node)
            for neighbor in deps.get(node, set()):
                dfs(neighbor)
            visiting.remove(node)
            visited.add(node)
            resolved.append(node)

        for f in formulas_def:
            if f not in visited:
                dfs(f)

        return resolved


safe_evaluator = SafeMathEvaluator()
