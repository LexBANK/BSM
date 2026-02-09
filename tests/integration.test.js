import test from "node:test";
import assert from "node:assert/strict";

process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || "test-admin-token-1234";
process.env.OPENAI_BSM_KEY = process.env.OPENAI_BSM_KEY || "sk-test-key";
process.env.MAX_AGENT_INPUT_LENGTH = "200";

const { default: app } = await import("../src/app.js");
const { default: audit } = await import("../src/services/audit.js");
const { validateConfig } = await import("../src/config/index.js");
const { loadAgents } = await import("../src/services/agentsService.js");

let server;
let baseUrl;
let knownAgentId;

const request = async (route, options = {}) => {
  const response = await fetch(`${baseUrl}${route}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
};

test("setup test server", async () => {
  const agents = await loadAgents();
  assert.ok(Array.isArray(agents) && agents.length > 0, "at least one agent is required for integration tests");
  knownAgentId = agents[0].id;

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test("validateConfig returns success with test env", () => {
  const result = validateConfig();
  assert.equal(result.valid, true);
});

test("GET /api/health returns ok", async () => {
  const { response, body } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /api/agents returns object with agents", async () => {
  const { response, body } = await request("/api/agents");
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.agents), true);
});

test("GET /api/admin/agents requires token", async () => {
  const { response } = await request("/api/admin/agents");
  assert.equal(response.status, 401);
});

test("POST /api/chat rejects too long input", async () => {
  const payload = { agentId: knownAgentId, input: "a".repeat(500) };
  const { response, body } = await request("/api/chat", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /max length/i);
});

test("POST /api/agents/run returns 404 for unknown agent", async () => {
  const { response, body } = await request("/api/agents/run", {
    method: "POST",
    body: JSON.stringify({ agentId: "non-existent-agent-12345", input: "test" })
  });
  assert.equal(response.status, 404);
  assert.match(body.error, /Agent not found/i);
});

test("audit blocks critical file deletion", async () => {
  await assert.rejects(
    () => audit.validateDeletion("src/services/audit.js", "hacker"),
    /CRITICAL/
  );
});

test("teardown test server", async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});
