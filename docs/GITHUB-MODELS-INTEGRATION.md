# GitHub Models API Integration

This document describes the GitHub Models API integration in the BSM platform using Azure REST AI Inference SDK.

## Overview

The BSM platform now supports GitHub Models API, allowing you to use various AI models hosted on GitHub's inference endpoint, including:
- GPT-4o and GPT-4o-mini
- DeepSeek-R1 models
- Other models available through GitHub Models

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# GitHub Models API (via Azure REST AI Inference)
GITHUB_TOKEN=your_github_token_here
GITHUB_MODELS_MODEL=gpt-4o
```

- `GITHUB_TOKEN`: Your GitHub personal access token with appropriate permissions
- `GITHUB_MODELS_MODEL`: Default model to use (optional, defaults to `gpt-4o`)

### Obtaining a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token (classic or fine-grained)
3. Ensure the token has the necessary permissions for model inference
4. Copy the token to your `.env` file

## API Endpoint

### POST /api/github-models

Use this endpoint to chat with GitHub Models.

#### Request Body

```json
{
  "message": "Your question here",
  "model": "gpt-4o",
  "maxTokens": 2048,
  "history": []
}
```

**Parameters:**
- `message` (required, string): The user's message/question
- `model` (optional, string): Model name to use. Defaults to `GITHUB_MODELS_MODEL` env variable
- `maxTokens` (optional, number): Maximum tokens to generate. Defaults to 2048
- `history` (optional, array): Conversation history array with `role` and `content` fields

#### Response

```json
{
  "output": "Model's response here",
  "model": "gpt-4o"
}
```

#### Example cURL Request

```bash
curl -X POST http://localhost:3000/api/github-models \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the capital of France?",
    "model": "gpt-4o"
  }'
```

#### Example with Conversation History

```bash
curl -X POST http://localhost:3000/api/github-models \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about it",
    "model": "gpt-4o",
    "history": [
      {"role": "user", "content": "What is the capital of France?"},
      {"role": "assistant", "content": "The capital of France is Paris."}
    ]
  }'
```

## Code Examples

### Basic Usage (Direct SDK)

See `examples/github-models-basic.js`:

```javascript
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const model = "gpt-4o";

const client = ModelClient(endpoint, new AzureKeyCredential(token));

const response = await client.path("/chat/completions").post({
  body: {
    messages: [
      { role: "user", content: "What is the capital of France?" }
    ],
    max_tokens: 2048,
    model: model
  }
});

if (isUnexpected(response)) {
  throw response.body.error;
}

console.log(response.body.choices[0].message.content);
```

### Using BSM API Endpoint

See `examples/github-models-api-usage.js`:

```javascript
import fetch from "node-fetch";

const response = await fetch("http://localhost:3000/api/github-models", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "What is the capital of France?",
    model: "gpt-4o",
    maxTokens: 2048
  })
});

const data = await response.json();
console.log("Response:", data.output);
console.log("Model used:", data.model);
```

## Available Models

The following models are available through GitHub Models:

- `gpt-4o` - GPT-4 Optimized
- `gpt-4o-mini` - Smaller, faster GPT-4o variant
- `deepseek/DeepSeek-R1-0528` - DeepSeek R1 model
- Other models as they become available on GitHub Models

Refer to the [GitHub Models documentation](https://docs.github.com/en/github-models) for the complete list of available models.

## Architecture

### Service Layer

**`src/services/githubModelsService.js`**
- Handles communication with GitHub Models API
- Uses Azure REST AI Inference SDK
- Provides error handling and validation
- Exports `runGitHubModels()` function

### Route Layer

**`src/routes/githubModels.js`**
- Express router for `/api/github-models` endpoint
- Validates request parameters
- Manages conversation history
- Returns formatted responses

### Configuration

**`src/config/models.js`**
- Centralized model configuration
- Stores GitHub token and default model
- Available via `models.github` object

**`src/config/env.js`**
- Environment variable management
- Exports `env.githubToken` and `env.githubModelsModel`

## Error Handling

The service includes comprehensive error handling:

- **Missing API Key**: Returns 500 error if `GITHUB_TOKEN` is not configured
- **Invalid Request**: Returns 400 error for missing or invalid parameters
- **API Errors**: Catches and formats GitHub Models API errors
- **Timeout**: 30-second timeout for API requests

## Security Considerations

1. **Token Protection**: Never commit your `GITHUB_TOKEN` to version control
2. **Environment Variables**: Store sensitive tokens in `.env` file (not tracked by git)
3. **Rate Limiting**: The BSM platform includes rate limiting to prevent abuse
4. **Input Validation**: All inputs are validated and sanitized
5. **Message Length**: Messages are limited by `MAX_AGENT_INPUT_LENGTH` (default: 4000 characters)

## Testing

To test the integration:

1. Set your `GITHUB_TOKEN` in `.env`
2. Start the server: `npm start`
3. Test the endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/github-models \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, world!"}'
   ```

Or run the example scripts:
```bash
node examples/github-models-basic.js
node examples/github-models-api-usage.js
```

## Troubleshooting

### "Missing GitHub token for models API"
- Ensure `GITHUB_TOKEN` is set in your `.env` file
- Verify the token has proper permissions

### "GitHub Models request failed"
- Check your internet connection
- Verify the GitHub Models service is available
- Ensure your token is valid and not expired
- Check if the specified model is available

### "Message too long"
- Reduce message length to under `MAX_AGENT_INPUT_LENGTH` (default: 4000 characters)
- Split longer messages into multiple requests

## Dependencies

This integration uses the following npm packages:

- `@azure-rest/ai-inference` - Azure REST client for AI inference
- `@azure/core-auth` - Azure authentication primitives

These are automatically installed when you run `npm install`.

## Integration with Existing Features

The GitHub Models integration is designed to work alongside existing BSM features:

- **Rate Limiting**: Same rate limits apply as other API endpoints
- **CORS**: Respects configured CORS origins
- **Logging**: Uses the same Pino logger for consistent logging
- **Error Handling**: Uses shared `AppError` class for consistent error responses
- **Security**: Protected by same security middleware (Helmet, etc.)

## Future Enhancements

Potential future improvements:

- Stream responses for real-time chat experience
- Support for additional model parameters (temperature, top_p, etc.)
- Model selection UI in admin panel
- Token usage tracking and reporting
- Model performance metrics and monitoring
- Automatic fallback to alternative models

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the example code in `examples/` directory
- Refer to [GitHub Models documentation](https://docs.github.com/en/github-models)
- Contact the BSM development team

## License

Copyright © 2026 LexBANK. All rights reserved.
