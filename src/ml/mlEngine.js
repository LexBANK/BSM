/**
 * BSM-AgentOS ML Engine
 * Machine learning and predictive analytics engine
 */

import logger from "../utils/logger.js";
import InferenceService from "./inferenceService.js";
import ModelRegistry from "./modelRegistry.js";

class MLEngine {
  constructor(options = {}) {
    this.options = options;
    this.inferenceService = new InferenceService(options.inference || {});
    this.modelRegistry = new ModelRegistry(options.registry || {});
    this.initialized = false;

    logger.info("ML Engine created");
  }

  /**
   * Initialize the ML engine
   */
  async initialize() {
    if (this.initialized) {
      logger.warn("ML Engine already initialized");
      return;
    }

    logger.info("Initializing ML Engine...");

    try {
      await this.modelRegistry.initialize();
      await this.inferenceService.initialize();

      this.initialized = true;
      logger.info("ML Engine initialized successfully");
    } catch (err) {
      logger.error({ err }, "Failed to initialize ML Engine");
      throw err;
    }
  }

  /**
   * Run inference on input data
   */
  async predict(modelName, input) {
    this.ensureInitialized();

    try {
      // Get model from registry
      const model = await this.modelRegistry.getModel(modelName);
      
      if (!model) {
        throw new Error(`Model not found: ${modelName}`);
      }

      // Run inference
      const result = await this.inferenceService.predict(model, input);

      logger.debug({ modelName }, "Prediction completed");
      return result;
    } catch (err) {
      logger.error({ err, modelName }, "Prediction failed");
      throw err;
    }
  }

  /**
   * Register a new model
   */
  async registerModel(modelConfig) {
    this.ensureInitialized();
    return await this.modelRegistry.registerModel(modelConfig);
  }

  /**
   * List available models
   */
  async listModels() {
    this.ensureInitialized();
    return await this.modelRegistry.listModels();
  }

  /**
   * Get model metadata
   */
  async getModel(modelName) {
    this.ensureInitialized();
    return await this.modelRegistry.getModel(modelName);
  }

  /**
   * Get ML engine status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      inference: this.inferenceService.getStatus(),
      registry: this.modelRegistry.getStatus(),
    };
  }

  /**
   * Shutdown the ML engine
   */
  async shutdown() {
    logger.info("Shutting down ML Engine...");

    await this.inferenceService.shutdown();
    await this.modelRegistry.shutdown();

    this.initialized = false;
    logger.info("ML Engine shut down");
  }

  /**
   * Ensure the engine is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("ML Engine is not initialized");
    }
  }
}

// Singleton instance
let mlEngineInstance = null;

export function getMLEngine(options = {}) {
  if (!mlEngineInstance) {
    mlEngineInstance = new MLEngine(options);
  }
  return mlEngineInstance;
}

export default MLEngine;
