/**
 * Lightweight execution engine for BSM-AgentOS style workflows.
 */
export class Engine {
  constructor({ now = () => new Date().toISOString() } = {}) {
    this.now = now;
  }

  run(workflow = {}, payload = {}) {
    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];

    const results = steps.map((step, index) => ({
      index,
      id: step.id ?? `step-${index + 1}`,
      type: step.type ?? "noop",
      status: "completed",
      output: payload[step.inputKey] ?? null
    }));

    return {
      workflowId: workflow.id ?? "default",
      startedAt: this.now(),
      completedAt: this.now(),
      status: "completed",
      results
    };
  }
}
