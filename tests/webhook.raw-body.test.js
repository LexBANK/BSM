import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";

import app from "../src/app.js";

const WEBHOOK_SECRET = "test-webhook-secret";

function createSignature(payloadBuffer) {
  const digest = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payloadBuffer)
    .digest("hex");
  return `sha256=${digest}`;
}

async function startServer() {
  return await new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test("GitHub webhook accepts signature generated from exact raw payload bytes", async () => {
  process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;

  const rawPayload = '{\n  "action": "opened",\n  "number": 11,\n  "pull_request": { "draft": true }\n}';
  const payloadBuffer = Buffer.from(rawPayload, "utf8");

  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/webhook/github`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "pull_request",
        "x-hub-signature-256": createSignature(payloadBuffer)
      },
      body: payloadBuffer
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, "skipped");
    assert.equal(body.reason, "Draft PR");
  } finally {
    server.close();
  }
});

test("GitHub webhook rejects signature based on re-serialized JSON", async () => {
  process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;

  const rawPayload = '{\n  "action": "opened",\n  "number": 12,\n  "pull_request": { "draft": true }\n}';
  const parsedPayload = JSON.parse(rawPayload);
  const reSerializedPayload = Buffer.from(JSON.stringify(parsedPayload), "utf8");

  const { server, port } = await startServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/webhook/github`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "pull_request",
        "x-hub-signature-256": createSignature(reSerializedPayload)
      },
      body: rawPayload
    });

    assert.equal(response.status, 401);
    const body = await response.text();
    assert.equal(body, "Unauthorized");
  } finally {
    server.close();
  }
});
