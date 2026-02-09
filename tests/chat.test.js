import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});

test("POST /api/chat/direct returns 400 on empty message", async () => {
  const response = await fetch(`${baseUrl}/api/chat/direct`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "" })
  });

  assert.equal(response.status, 400);
});

test("POST /api/chat/direct rejects unsupported language", async () => {
  const response = await fetch(`${baseUrl}/api/chat/direct`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello", language: "fr" })
  });

  assert.equal(response.status, 400);
});
