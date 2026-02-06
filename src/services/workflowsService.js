import { Engine } from "../../core/engine.js";

const defaultWorkflow = {
  id: "bsm-agentos-core",
  steps: [
    { id: "ingest", type: "ingest", inputKey: "input" },
    { id: "validate", type: "validate", inputKey: "rules" },
    { id: "dispatch", type: "dispatch", inputKey: "target" }
  ]
};

const engine = new Engine();

export function executeWorkflow(payload) {
  return engine.run(defaultWorkflow, payload);
}

export function getWorkflowDefinition() {
  return defaultWorkflow;
}
