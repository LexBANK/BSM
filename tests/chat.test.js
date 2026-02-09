import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

const startServer = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`
  };
};

test("POST /api/chat/direct returns 400 for empty message", async () => {
  const { server, baseUrl } = await startServer();

  try {
    const res = await fetch(`${baseUrl}/api/chat/direct`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "" })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "INVALID_INPUT");
  } finally {
    server.close();
  }
});

test("POST /api/chat/direct returns 400 for unsupported language", async () => {
  const { server, baseUrl } = await startServer();

  try {
    const res = await fetch(`${baseUrl}/api/chat/direct`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello", language: "fr" })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "INVALID_LANGUAGE");
  } finally {
    server.close();
  }
});

test("POST /api/chat/direct returns 400 when history is not an array", async () => {
  const { server, baseUrl } = await startServer();

  try {
    const res = await fetch(`${baseUrl}/api/chat/direct`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello", history: "bad" })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "INVALID_HISTORY");
  } finally {
    server.close();
  }
});

test("POST /api/chat returns graceful output for missing agent", async () => {
  const { server, baseUrl } = await startServer();

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "unknown-agent", input: "hello" })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.output, "string");
  } finally {
    server.close();
  }
});
