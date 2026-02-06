import fetch from "node-fetch";

// Example: Using BSM's GitHub Models API endpoint
async function callBSMGitHubModels() {
  const apiUrl = "http://localhost:3000/api/github-models";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "What is the capital of France?",
      model: "gpt-4o", // Optional: specify model, defaults to GITHUB_MODELS_MODEL env var
      maxTokens: 2048, // Optional: defaults to 2048
      history: [] // Optional: conversation history
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${error}`);
  }

  const data = await response.json();
  console.log("Response:", data.output);
  console.log("Model used:", data.model);
}

// Example with conversation history
async function chatWithHistory() {
  const apiUrl = "http://localhost:3000/api/github-models";

  const history = [
    { role: "user", content: "What is the capital of France?" },
    { role: "assistant", content: "The capital of France is Paris." },
    { role: "user", content: "What is its population?" }
  ];

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "And what about its famous landmarks?",
      history,
      model: "gpt-4o"
    })
  });

  const data = await response.json();
  console.log("\nChat response:", data.output);
}

// Run examples
(async () => {
  console.log("=== Basic Example ===");
  await callBSMGitHubModels();

  console.log("\n=== Chat with History Example ===");
  await chatWithHistory();
})().catch(console.error);
