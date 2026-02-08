type Telemetry = {
  errors: number;
  cacheHitRate: number;
  branches: number;
  duplicateFiles: number;
  duplicateCodeBlocks: number;
};

export type OrbitAction =
  | 'trigger:deploy'
  | 'trigger:purge-cache'
  | 'trigger:cleanup-branches'
  | 'trigger:dedupe-files'
  | 'trigger:dedupe-code';

export class OrbitEngine {
  constructor(private telemetry: Telemetry) {}

  evaluate(): OrbitAction[] {
    const actions: OrbitAction[] = [];

    if (this.telemetry.errors > 10) {
      actions.push('trigger:deploy');
    }

    if (this.telemetry.cacheHitRate < 0.4) {
      actions.push('trigger:purge-cache');
    }

    if (this.telemetry.branches > 40) {
      actions.push('trigger:cleanup-branches');
    }

    if (this.telemetry.duplicateFiles > 0) {
      actions.push('trigger:dedupe-files');
    }

    if (this.telemetry.duplicateCodeBlocks > 0) {
      actions.push('trigger:dedupe-code');
    }

    return Array.from(new Set(actions));
  }
}

export type { Telemetry };
