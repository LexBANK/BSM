/**
 * BSM-AgentOS Test Suite
 * Unit tests for Core Engine
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import CoreEngine from "../../../src/core/engine.js";

describe("Core Engine", () => {
  let engine;

  beforeEach(() => {
    engine = new CoreEngine({
      maxConcurrentTasks: 5,
      taskTimeout: 10000,
      retryAttempts: 2,
    });
  });

  afterEach(async () => {
    if (engine && engine.status === "running") {
      await engine.stop();
    }
  });

  describe("Initialization", () => {
    it("should create engine with default options", () => {
      const defaultEngine = new CoreEngine();
      expect(defaultEngine).toBeDefined();
      expect(defaultEngine.status).toBe("stopped");
    });

    it("should create engine with custom options", () => {
      expect(engine.options.maxConcurrentTasks).toBe(5);
      expect(engine.options.taskTimeout).toBe(10000);
      expect(engine.options.retryAttempts).toBe(2);
    });

    it("should initialize all components", () => {
      expect(engine.agentManager).toBeDefined();
      expect(engine.taskQueue).toBeDefined();
      expect(engine.eventBus).toBeDefined();
    });
  });

  describe("Lifecycle", () => {
    it("should start successfully", async () => {
      await engine.start();
      expect(engine.status).toBe("running");
    });

    it("should not start if already running", async () => {
      await engine.start();
      await engine.start(); // Second call
      expect(engine.status).toBe("running");
    });

    it("should stop successfully", async () => {
      await engine.start();
      await engine.stop();
      expect(engine.status).toBe("stopped");
    });

    it("should not stop if not running", async () => {
      await engine.stop();
      expect(engine.status).toBe("stopped");
    });
  });

  describe("Task Execution", () => {
    it("should require agentId", async () => {
      await engine.start();
      
      await expect(async () => {
        await engine.executeTask({ input: "test" });
      }).rejects.toThrow("agentId is required");
    });

    it("should require input", async () => {
      await engine.start();
      
      await expect(async () => {
        await engine.executeTask({ agentId: "test-agent" });
      }).rejects.toThrow("input is required");
    });
  });

  describe("Metrics", () => {
    it("should initialize with zero metrics", () => {
      expect(engine.metrics.tasksProcessed).toBe(0);
      expect(engine.metrics.tasksSucceeded).toBe(0);
      expect(engine.metrics.tasksFailed).toBe(0);
    });

    it("should update metrics on success", () => {
      engine.updateMetrics(true, 100);
      expect(engine.metrics.tasksProcessed).toBe(1);
      expect(engine.metrics.tasksSucceeded).toBe(1);
      expect(engine.metrics.tasksFailed).toBe(0);
    });

    it("should update metrics on failure", () => {
      engine.updateMetrics(false, 100);
      expect(engine.metrics.tasksProcessed).toBe(1);
      expect(engine.metrics.tasksSucceeded).toBe(0);
      expect(engine.metrics.tasksFailed).toBe(1);
    });
  });

  describe("Status", () => {
    it("should return correct status", () => {
      const status = engine.getStatus();
      expect(status.status).toBe("stopped");
      expect(status.metrics).toBeDefined();
      expect(status.queue).toBeDefined();
      expect(status.agents).toBeDefined();
    });
  });
});
