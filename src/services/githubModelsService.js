import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { AppError } from "../utils/errors.js";

const GITHUB_MODELS_ENDPOINT = "https://models.inference.ai.azure.com";
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Run GitHub Models inference using Azure REST AI Inference SDK
 * @param {Object} options - The inference options
 * @param {string} options.model - The model name (e.g., "gpt-4o", "deepseek/DeepSeek-R1-0528")
 * @param {string} options.apiKey - GitHub token for authentication
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {number} [options.maxTokens=2048] - Maximum tokens to generate
 * @returns {Promise<string>} The model's response content
 */
export const runGitHubModels = async ({ model, apiKey, messages, maxTokens = 2048 }) => {
  if (!apiKey) {
    throw new AppError("Missing GitHub token for models API", 500, "MISSING_API_KEY");
  }

  if (!model) {
    throw new AppError("Model name is required", 400, "MISSING_MODEL");
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new AppError("Messages array is required and must not be empty", 400, "INVALID_MESSAGES");
  }

  try {
    const client = ModelClient(
      GITHUB_MODELS_ENDPOINT,
      new AzureKeyCredential(apiKey)
    );

    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: maxTokens,
        model: model
      }
    });

    if (isUnexpected(response)) {
      const errorMessage = response.body?.error?.message || "Unknown error occurred";
      throw new AppError(`GitHub Models request failed: ${errorMessage}`, 500, "GITHUB_MODELS_ERROR");
    }

    return response.body.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(`GitHub Models error: ${err.message}`, 500, "GITHUB_MODELS_ERROR");
  }
};
