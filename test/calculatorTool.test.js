import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatorTool } from '../src/tools/calculatorTool.js';

test('evaluates valid arithmetic expression', () => {
  assert.equal(calculatorTool('2 + 3 * (4 - 1)'), 11);
});

test('supports unary minus', () => {
  assert.equal(calculatorTool('-3 + 10'), 7);
});

test('rejects division by zero', () => {
  assert.throws(() => calculatorTool('10 / 0'), /division by zero/i);
});

test('rejects unbalanced parentheses', () => {
  assert.throws(() => calculatorTool('(2 + 3'), /unbalanced parentheses/i);
  assert.throws(() => calculatorTool('2 + 3)'), /unbalanced parentheses/i);
});

test('rejects text input and unsupported symbols', () => {
  assert.throws(() => calculatorTool('2 + abc'), /only digits/i);
  assert.throws(() => calculatorTool('2 ^ 3'), /only digits/i);
});

test('rejects malformed decimals', () => {
  assert.throws(() => calculatorTool('1..2 + 3'), /malformed number/i);
});
