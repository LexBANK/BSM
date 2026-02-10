import { Router } from "express";
import { AppError } from "../utils/errors.js";
import {
  evaluateArithmeticExpression,
  expressionLimits
} from "../services/expressionEvaluator.js";

const router = Router();

router.post("/evaluate", (req, res, next) => {
  try {
    const { expression } = req.body ?? {};
    const result = evaluateArithmeticExpression(expression);

    res.json({
      result,
      limits: expressionLimits
    });
  } catch (error) {
    next(
      new AppError(
        "Invalid arithmetic expression",
        400,
        "INVALID_ARITHMETIC_EXPRESSION"
      )
    );
  }
});

export default router;
