const ALLOWED_EXPRESSION_REGEX = /^[0-9+\-*/().\s]+$/;

const OPERATORS = {
  '+': { precedence: 1, associativity: 'left', arity: 2 },
  '-': { precedence: 1, associativity: 'left', arity: 2 },
  '*': { precedence: 2, associativity: 'left', arity: 2 },
  '/': { precedence: 2, associativity: 'left', arity: 2 },
  'u+': { precedence: 3, associativity: 'right', arity: 1 },
  'u-': { precedence: 3, associativity: 'right', arity: 1 }
};

function normalizeInput(expression) {
  if (typeof expression !== 'string') {
    throw new Error('Invalid expression: input must be a string containing numbers and operators.');
  }

  const normalized = expression.trim();
  if (!normalized) {
    throw new Error('Invalid expression: input cannot be empty.');
  }

  if (!ALLOWED_EXPRESSION_REGEX.test(normalized)) {
    throw new Error('Invalid expression: only digits, whitespace, and operators + - * / ( ) . are allowed.');
  }

  return normalized;
}

function tokenize(expression) {
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let number = '';
      let dotCount = 0;

      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        if (expression[index] === '.') {
          dotCount += 1;
        }

        number += expression[index];
        index += 1;
      }

      if (dotCount > 1 || number === '.') {
        throw new Error(`Invalid expression: malformed number "${number}".`);
      }

      tokens.push({ type: 'number', value: Number(number) });
      continue;
    }

    if ('+-*/()'.includes(char)) {
      tokens.push({ type: 'symbol', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Invalid expression: unsupported token "${char}".`);
  }

  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const operators = [];
  let prevTokenType = 'start';

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);
      prevTokenType = 'number';
      continue;
    }

    const symbol = token.value;

    if (symbol === '(') {
      operators.push({ type: 'symbol', value: symbol });
      prevTokenType = 'left_paren';
      continue;
    }

    if (symbol === ')') {
      let foundLeftParen = false;
      while (operators.length > 0) {
        const top = operators.pop();
        if (top.value === '(') {
          foundLeftParen = true;
          break;
        }
        output.push(top);
      }

      if (!foundLeftParen) {
        throw new Error('Invalid expression: unbalanced parentheses.');
      }

      prevTokenType = 'right_paren';
      continue;
    }

    let opSymbol = symbol;
    if ((symbol === '+' || symbol === '-') && (prevTokenType === 'start' || prevTokenType === 'operator' || prevTokenType === 'left_paren')) {
      opSymbol = symbol === '+' ? 'u+' : 'u-';
    }

    const current = { type: 'operator', value: opSymbol };
    const currentOp = OPERATORS[opSymbol];

    while (operators.length > 0) {
      const top = operators[operators.length - 1];
      if (top.value === '(') {
        break;
      }

      const topOp = OPERATORS[top.value];
      const shouldPop =
        (currentOp.associativity === 'left' && currentOp.precedence <= topOp.precedence) ||
        (currentOp.associativity === 'right' && currentOp.precedence < topOp.precedence);

      if (!shouldPop) {
        break;
      }

      output.push(operators.pop());
    }

    operators.push(current);
    prevTokenType = 'operator';
  }

  while (operators.length > 0) {
    const top = operators.pop();
    if (top.value === '(' || top.value === ')') {
      throw new Error('Invalid expression: unbalanced parentheses.');
    }
    output.push(top);
  }

  return output;
}

function evaluateRpn(rpn) {
  const stack = [];

  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(token.value);
      continue;
    }

    const operator = token.value;

    if (OPERATORS[operator].arity === 1) {
      if (stack.length < 1) {
        throw new Error('Invalid expression: malformed unary operation.');
      }
      const value = stack.pop();
      stack.push(operator === 'u-' ? -value : value);
      continue;
    }

    if (stack.length < 2) {
      throw new Error('Invalid expression: malformed binary operation.');
    }

    const right = stack.pop();
    const left = stack.pop();

    if (operator === '+') stack.push(left + right);
    else if (operator === '-') stack.push(left - right);
    else if (operator === '*') stack.push(left * right);
    else if (operator === '/') {
      if (right === 0) {
        throw new Error('Math error: division by zero is not allowed.');
      }
      stack.push(left / right);
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error('Invalid expression: could not evaluate input.');
  }

  return stack[0];
}

export function calculatorTool(expression) {
  const normalized = normalizeInput(expression);
  const tokens = tokenize(normalized);
  const rpn = toRpn(tokens);
  return evaluateRpn(rpn);
}

export const __internal = {
  normalizeInput,
  tokenize,
  toRpn,
  evaluateRpn,
  ALLOWED_EXPRESSION_REGEX
};
