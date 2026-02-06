import assert from "node:assert";
import test, { after, before, describe } from "node:test";
import { unstable_startWorker } from "wrangler";

describe("worker", () => {
  let worker;

  before(async () => {
    worker = await unstable_startWorker({ config: "wrangler.json" });
  });

  test("hello world", async () => {
    assert.strictEqual(
      await (await worker.fetch("http://example.com")).text(),
      "Hello world",
    );
  });

  after(async () => {
    await worker.dispose();
  });
});
