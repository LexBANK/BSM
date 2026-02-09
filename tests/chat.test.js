import test from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_BSM_KEY = process.env.OPENAI_BSM_KEY || "test-key";

const { default: app } = await import("../src/app.js");

const startServer = () => new Promise((resolve) => {
  const server = app.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
  });
});

const stopServer = (server) => new Promise((resolve, reject) => {
  server.close((err) => (err ? reject(err) : resolve()));
});

test("POST /api/chat returns response schema with agent output", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "missing-agent", input: "Hello" })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body, "object");
    assert.equal(typeof body.output, "string");
  } finally {
    await stopServer(server);
  }
});

test("POST /api/chat/direct validates request schema and returns 400", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/chat/direct`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "", language: "ar", history: [] })
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(typeof body.error, "string");
    assert.equal(body.code, "INVALID_INPUT");
    assert.equal(typeof body.correlationId, "string");
  } finally {
    await stopServer(server);
  }
});

test("POST /api/chat/direct rejects invalid language with 400", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/chat/direct`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello", language: "fr", history: [] })
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, "INVALID_LANGUAGE");
  } finally {
    await stopServer(server);
  }
});
