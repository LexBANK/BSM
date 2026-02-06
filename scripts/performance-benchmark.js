#!/usr/bin/env node
/**
 * Performance Benchmark Script
 * Tests the performance improvements from caching and async I/O optimizations
 */

import { loadAgents, clearAgentsCache } from "../src/services/agentsService.js";
import { loadKnowledgeIndex, clearKnowledgeCache } from "../src/services/knowledgeService.js";

const benchmark = async (name, fn, iterations = 10) => {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000; // Convert to milliseconds
    times.push(ms);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`\n${name}:`);
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  
  return { avg, min, max };
};

const main = async () => {
  console.log("=".repeat(60));
  console.log("BSM Performance Benchmark");
  console.log("=".repeat(60));

  console.log("\n📊 Testing Agent Loading Performance");
  console.log("-".repeat(60));
  
  // Test agents loading WITHOUT cache (first load)
  clearAgentsCache();
  console.log("\n1️⃣  Cold start (no cache, first load):");
  const coldAgents = await benchmark("Load Agents (Cold)", loadAgents, 1);
  
  // Test agents loading WITH cache (subsequent loads)
  console.log("\n2️⃣  Warm start (cached, subsequent loads):");
  const warmAgents = await benchmark("Load Agents (Cached)", loadAgents, 10);
  
  const agentsSpeedup = (coldAgents.avg / warmAgents.avg).toFixed(1);
  console.log(`\n✨ Cache speedup: ${agentsSpeedup}x faster`);

  console.log("\n📊 Testing Knowledge Loading Performance");
  console.log("-".repeat(60));
  
  // Test knowledge loading WITHOUT cache (first load)
  clearKnowledgeCache();
  console.log("\n1️⃣  Cold start (no cache, first load):");
  const coldKnowledge = await benchmark("Load Knowledge (Cold)", loadKnowledgeIndex, 1);
  
  // Test knowledge loading WITH cache (subsequent loads)
  console.log("\n2️⃣  Warm start (cached, subsequent loads):");
  const warmKnowledge = await benchmark("Load Knowledge (Cached)", loadKnowledgeIndex, 10);
  
  const knowledgeSpeedup = (coldKnowledge.avg / warmKnowledge.avg).toFixed(1);
  console.log(`\n✨ Cache speedup: ${knowledgeSpeedup}x faster`);

  // Combined test: simulating actual request flow
  console.log("\n📊 Simulating Actual Request Flow");
  console.log("-".repeat(60));
  
  const simulateRequest = async () => {
    await loadAgents();
    await loadKnowledgeIndex();
  };
  
  // First request (cold)
  clearAgentsCache();
  clearKnowledgeCache();
  console.log("\n1️⃣  First request (cold):");
  const coldRequest = await benchmark("Complete Request (Cold)", simulateRequest, 1);
  
  // Subsequent requests (warm)
  console.log("\n2️⃣  Subsequent requests (cached):");
  const warmRequest = await benchmark("Complete Request (Cached)", simulateRequest, 20);
  
  const requestSpeedup = (coldRequest.avg / warmRequest.avg).toFixed(1);
  console.log(`\n✨ Overall speedup: ${requestSpeedup}x faster for cached requests`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📈 PERFORMANCE SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n✅ Agent Loading: ${agentsSpeedup}x faster with cache`);
  console.log(`✅ Knowledge Loading: ${knowledgeSpeedup}x faster with cache`);
  console.log(`✅ Complete Request: ${requestSpeedup}x faster with cache`);
  console.log("\n💡 Additional Optimizations Applied:");
  console.log("   • Async I/O (non-blocking file operations)");
  console.log("   • Parallel file loading with Promise.all()");
  console.log("   • HTTP connection pooling with keep-alive");
  console.log("   • CORS origin checking: O(n) → O(1) with Set");
  console.log("   • Agent lookup: O(n) → O(1) with Map");
  console.log("\n" + "=".repeat(60));
};

main().catch(console.error);
