/**
 * Cloudflare Worker entry point
 * Simple worker that responds with "Hello world"
 */

export default {
  async fetch(request, env, ctx) {
    return new Response("Hello world", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
