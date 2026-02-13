import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

import { verifySignature } from "../src/controllers/webhookController.js";

test("verifySignature rejects when GITHUB_WEBHOOK_SECRET is missing", () => {
  const payload = JSON.stringify({ action: "opened" });
  const signature = "sha256=abc123";

  assert.equal(verifySignature(payload, signature, undefined), false);
});

test("verifySignature accepts when secret exists and signature is valid", () => {
  const payload = JSON.stringify({ action: "opened", number: 42 });
  const secret = "super-secret";
  const signature = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;

  assert.equal(verifySignature(payload, signature, secret), true);
});


test("verifySignature يعتمد على raw bytes حتى مع اختلاف تنسيق JSON", () => {
  const secret = "super-secret";
  const compactPayload = Buffer.from('{"action":"opened","number":42}', "utf8");
  const spacedPayload = Buffer.from('{  "number" : 42 , "action" : "opened" }', "utf8");

  const compactSignature = `sha256=${crypto.createHmac("sha256", secret).update(compactPayload).digest("hex")}`;
  const spacedSignature = `sha256=${crypto.createHmac("sha256", secret).update(spacedPayload).digest("hex")}`;

  assert.equal(verifySignature(spacedPayload, spacedSignature, secret), true);
  assert.equal(verifySignature(spacedPayload, compactSignature, secret), false);
});
