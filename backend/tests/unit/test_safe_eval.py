import pytest

from app.core.exceptions import SimulationInvalidError
from app.processing.safe_eval import safe_evaluator


def test_safe_math_basic_arithmetic():
    vars_env = {"rent": 1800.0, "months": 12.0, "fee": 50.0}
    val = safe_evaluator.evaluate_formula("rent * months + fee", vars_env)
    assert val == 1800.0 * 12.0 + 50.0


def test_safe_math_min_max():
    vars_env = {"penalty": 120.0, "cap": 100.0}
    val = safe_evaluator.evaluate_formula("min(penalty, cap)", vars_env)
    assert val == 100.0

    val_max = safe_evaluator.evaluate_formula("max(penalty, cap)", vars_env)
    assert val_max == 120.0


def test_safe_math_division_by_zero():
    vars_env = {"a": 100.0, "b": 0.0}
    val = safe_evaluator.evaluate_formula("a / b", vars_env)
    assert val is None


def test_safe_math_cycle_detection():
    var_defs = {"rent": {"value": 1000.0}}
    formulas = {
        "formA": {"expr": "formB + 10", "depends": ["formB"]},
        "formB": {"expr": "formA * 2", "depends": ["formA"]},
    }
    with pytest.raises(SimulationInvalidError):
        safe_evaluator.evaluate_model(var_defs, formulas)
