/**
 * BSM-AgentOS Model Registry
 * Manages ML model metadata and versioning
 */

import logger from "../utils/logger.js";

class ModelRegistry {
  constructor(options = {}) {
    this.options = options;
    this.models = new Map(); // modelName -> model metadata
    this.initialized = false;
  }

  /**
   * Initialize the model registry
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    logger.info("Initializing Model Registry...");

    // Register default demo models
    await this.registerModel({
      name: "sentiment-analyzer",
      type: "sentiment",
      version: "1.0.0",
      description: "Sentiment analysis model for text classification",
      tags: ["nlp", "sentiment", "classification"],
    });

    await this.registerModel({
      name: "task-classifier",
      type: "classification",
      version: "1.0.0",
      description: "Task type classification model",
      classes: ["urgent", "normal", "low-priority"],
      tags: ["classification", "tasks"],
    });

    await this.registerModel({
      name: "agent-recommender",
      type: "recommendation",
      version: "1.0.0",
      description: "Recommends best agent for a task",
      tags: ["recommendation", "agents"],
    });

    this.initialized = true;
    logger.info({ count: this.models.size }, "Model Registry initialized");
  }

  /**
   * Register a new model
   */
  async registerModel(modelConfig) {
    const { name, type, version } = modelConfig;

    if (!name || !type) {
      throw new Error("Model must have name and type");
    }

    const model = {
      ...modelConfig,
      version: version || "1.0.0",
      registeredAt: new Date(),
      status: "active",
    };

    this.models.set(name, model);

    logger.info({ modelName: name, type, version: model.version }, "Model registered");
    return model;
  }

  /**
   * Get a model by name
   */
  async getModel(modelName) {
    return this.models.get(modelName) || null;
  }

  /**
   * List all models
   */
  async listModels(filters = {}) {
    let models = Array.from(this.models.values());

    // Apply filters
    if (filters.type) {
      models = models.filter((m) => m.type === filters.type);
    }

    if (filters.tag) {
      models = models.filter((m) => m.tags && m.tags.includes(filters.tag));
    }

    if (filters.status) {
      models = models.filter((m) => m.status === filters.status);
    }

    return models;
  }

  /**
   * Update model metadata
   */
  async updateModel(modelName, updates) {
    const model = this.models.get(modelName);

    if (!model) {
      throw new Error(`Model not found: ${modelName}`);
    }

    Object.assign(model, updates);
    model.updatedAt = new Date();

    logger.info({ modelName }, "Model updated");
    return model;
  }

  /**
   * Unregister a model
   */
  async unregisterModel(modelName) {
    const model = this.models.get(modelName);

    if (!model) {
      throw new Error(`Model not found: ${modelName}`);
    }

    this.models.delete(modelName);

    logger.info({ modelName }, "Model unregistered");
    return model;
  }

  /**
   * Get registry status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      totalModels: this.models.size,
      activeModels: Array.from(this.models.values()).filter((m) => m.status === "active").length,
    };
  }

  /**
   * Shutdown the registry
   */
  async shutdown() {
    this.models.clear();
    this.initialized = false;
    logger.info("Model Registry shut down");
  }
}

export default ModelRegistry;
