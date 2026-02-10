const ALLOWED_INPUT_REGEX = /^[0-9+\-*/().\s]+$/;

const DEFAULT_LIMITS = {
  maxLength: 256,
  maxTokens: 256,
  maxNesting: 32
};

const PRECEDENCE = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2
};

const OPERATORS = new Set(Object.keys(PRECEDENCE));

class ExpressionError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "ExpressionError";
  }
}

const isNumberToken = (token) => token.type === "number";
const isOperatorToken = (token) => token.type === "operator";

const tokenize = (input, limits) => {
  if (typeof input !== "string") {
    throw new ExpressionError("Expression must be a string");
  }

  if (input.length === 0 || input.length > limits.maxLength) {
    throw new ExpressionError("Expression length exceeds limits");
  }

  if (!ALLOWED_INPUT_REGEX.test(input)) {
    throw new ExpressionError("Expression contains disallowed characters");
  }

  const tokens = [];
  let nesting = 0;

  for (let i = 0; i < input.length;) {
    const char = input[i];

    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      i += 1;
      continue;
    }

    if ((char >= "0" && char <= "9") || char === ".") {
      let number = "";
      let dots = 0;

      while (i < input.length) {
        const c = input[i];
        if ((c >= "0" && c <= "9") || c === ".") {
          if (c === ".") {
            dots += 1;
            if (dots > 1) {
              throw new ExpressionError("Invalid number format");
            }
          }
          number += c;
          i += 1;
          continue;
        }
        break;
      }

      if (number === ".") {
        throw new ExpressionError("Invalid number format");
      }

      tokens.push({ type: "number", value: Number(number) });
      continue;
    }

    if (OPERATORS.has(char)) {
      tokens.push({ type: "operator", value: char });
      i += 1;
      continue;
    }

    if (char === "(") {
      nesting += 1;
      if (nesting > limits.maxNesting) {
        throw new ExpressionError("Expression nesting exceeds limits");
      }
      tokens.push({ type: "leftParen", value: char });
      i += 1;
      continue;
    }

    if (char === ")") {
      nesting -= 1;
      if (nesting < 0) {
        throw new ExpressionError("Unbalanced parentheses");
      }
      tokens.push({ type: "rightParen", value: char });
      i += 1;
      continue;
    }

    throw new ExpressionError("Invalid token");
  }

  if (nesting !== 0) {
    throw new ExpressionError("Unbalanced parentheses");
  }

  if (tokens.length === 0 || tokens.length > limits.maxTokens) {
    throw new ExpressionError("Expression complexity exceeds limits");
  }

  return tokens;
};

const normalizeUnaryOperators = (tokens) => {
  const normalized = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type !== "operator" || (token.value !== "+" && token.value !== "-")) {
      normalized.push(token);
      continue;
    }

    const previous = normalized[normalized.length - 1];
    const isUnary = !previous || previous.type === "operator" || previous.type === "leftParen";

    if (!isUnary) {
      normalized.push(token);
      continue;
    }

    normalized.push({ type: "number", value: 0 });
    normalized.push(token);
  }

  return normalized;
};

const toRpn = (tokens) => {
  const output = [];
  const operators = [];

  for (const token of tokens) {
    if (isNumberToken(token)) {
      output.push(token);
      continue;
    }

    if (isOperatorToken(token)) {
      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (
          top.type === "operator" &&
          PRECEDENCE[top.value] >= PRECEDENCE[token.value]
        ) {
          output.push(operators.pop());
        } else {
          break;
        }
      }
      operators.push(token);
      continue;
    }

    if (token.type === "leftParen") {
      operators.push(token);
      continue;
    }

    if (token.type === "rightParen") {
      let found = false;
      while (operators.length > 0) {
        const top = operators.pop();
        if (top.type === "leftParen") {
          found = true;
          break;
        }
        output.push(top);
      }

      if (!found) {
        throw new ExpressionError("Unbalanced parentheses");
      }
    }
  }

  while (operators.length > 0) {
    const token = operators.pop();
    if (token.type === "leftParen" || token.type === "rightParen") {
      throw new ExpressionError("Unbalanced parentheses");
    }
    output.push(token);
  }

  return output;
};

const evaluateRpn = (tokens) => {
  const stack = [];

  for (const token of tokens) {
    if (isNumberToken(token)) {
      stack.push(token.value);
      continue;
    }

    if (!isOperatorToken(token) || stack.length < 2) {
      throw new ExpressionError("Malformed expression");
    }

    const right = stack.pop();
    const left = stack.pop();
    let value;

    switch (token.value) {
      case "+":
        value = left + right;
        break;
      case "-":
        value = left - right;
        break;
      case "*":
        value = left * right;
        break;
      case "/":
        if (right === 0) {
          throw new ExpressionError("Division by zero");
        }
        value = left / right;
        break;
      default:
        throw new ExpressionError("Unknown operator");
    }

    if (!Number.isFinite(value)) {
      throw new ExpressionError("Non-finite result");
    }

    stack.push(value);
  }

  if (stack.length !== 1) {
    throw new ExpressionError("Malformed expression");
  }

  return stack[0];
};

export const evaluateArithmeticExpression = (input, customLimits = {}) => {
  const limits = { ...DEFAULT_LIMITS, ...customLimits };

  try {
    const tokens = tokenize(input, limits);
    const normalizedTokens = normalizeUnaryOperators(tokens);
    const rpn = toRpn(normalizedTokens);
    return evaluateRpn(rpn);
  } catch (error) {
    if (error instanceof ExpressionError) {
      throw new Error("INVALID_ARITHMETIC_EXPRESSION");
    }
    throw error;
  }
};

export const expressionLimits = { ...DEFAULT_LIMITS };
