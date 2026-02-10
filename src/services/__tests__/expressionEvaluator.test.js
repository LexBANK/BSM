import test from "node:test";
import assert from "node:assert/strict";
import { evaluateArithmeticExpression } from "../expressionEvaluator.js";

test("evaluates operator precedence and parentheses", () => {
  const result = evaluateArithmeticExpression("(2 + 3) * 4 - 6 / 3");
  assert.equal(result, 18);
});

test("supports unary minus", () => {
  const result = evaluateArithmeticExpression("-3 + 5");
  assert.equal(result, 2);
});

test("rejects disallowed characters", () => {
  assert.throws(() => evaluateArithmeticExpression("1 + alert(1)"));
});

test("rejects excessive nesting", () => {
  const expr = "(".repeat(33) + "1" + ")".repeat(33);
  assert.throws(() => evaluateArithmeticExpression(expr));
});

test("rejects division by zero", () => {
  assert.throws(() => evaluateArithmeticExpression("10 / 0"));
});
