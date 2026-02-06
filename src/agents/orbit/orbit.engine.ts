/**
 * ORBIT Self-Healing Engine
 * Core orchestration and monitoring engine for BSM platform
 * Detects issues, triggers automated repairs, and maintains system health
 */

import { OrbitWorker } from './orbit.worker.js';
import { OrbitActions } from './orbit.actions.js';

export interface HealthCheck {
  timestamp: number;
  status: 'healthy' | 'degraded' | 'critical';
  issues: Issue[];
  metrics: SystemMetrics;
}

export interface Issue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  component: string;
  detectedAt: number;
  autoFixable: boolean;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  apiLatency: number;
  errorRate: number;
  uptime: number;
}

export interface RepairAction {
  issueId: string;
  action: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export class OrbitEngine {
  private worker: OrbitWorker;
  private actions: OrbitActions;
  private monitoringInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private healthHistory: HealthCheck[] = [];
  private repairHistory: RepairAction[] = [];

  constructor() {
    this.worker = new OrbitWorker();
    this.actions = new OrbitActions();
  }

  /**
   * Start the ORBIT self-healing engine
   */
  async start(config?: { interval?: number }): Promise<void> {
    if (this.isRunning) {
      console.log('[ORBIT] Engine already running');
      return;
    }

    console.log('[ORBIT] Starting self-healing engine...');
    this.isRunning = true;

    const interval = config?.interval || 60000; // Default: 1 minute
    
    // Run initial health check
    await this.runHealthCheck();

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      await this.runHealthCheck();
    }, interval);

    console.log(`[ORBIT] Engine started with ${interval}ms interval`);
  }

  /**
   * Stop the ORBIT engine
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[ORBIT] Engine not running');
      return;
    }

    console.log('[ORBIT] Stopping self-healing engine...');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isRunning = false;
    console.log('[ORBIT] Engine stopped');
  }

  /**
   * Run a health check and trigger repairs if needed
   */
  async runHealthCheck(): Promise<HealthCheck> {
    console.log('[ORBIT] Running health check...');

    const metrics = await this.collectMetrics();
    const issues = await this.detectIssues(metrics);
    const status = this.calculateStatus(issues);

    const healthCheck: HealthCheck = {
      timestamp: Date.now(),
      status,
      issues,
      metrics
    };

    this.healthHistory.push(healthCheck);
    // Keep only last 100 checks
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }

    console.log(`[ORBIT] Health status: ${status} (${issues.length} issues)`);

    // Trigger automated repairs for auto-fixable issues
    const autoFixableIssues = issues.filter(issue => issue.autoFixable);
    if (autoFixableIssues.length > 0) {
      console.log(`[ORBIT] Found ${autoFixableIssues.length} auto-fixable issues, initiating repairs...`);
      await this.initiateRepairs(autoFixableIssues);
    }

    return healthCheck;
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<SystemMetrics> {
    const metrics: SystemMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      apiLatency: 0,
      errorRate: 0,
      uptime: process.uptime()
    };

    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      metrics.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // CPU usage (simplified - would need proper monitoring in production)
      metrics.cpuUsage = Math.random() * 100; // Placeholder

      // Disk usage (placeholder - would need filesystem monitoring)
      metrics.diskUsage = Math.random() * 100; // Placeholder

      // API latency (placeholder - would need actual API monitoring)
      metrics.apiLatency = Math.random() * 1000; // Placeholder

      // Error rate (placeholder - would need actual error tracking)
      metrics.errorRate = Math.random() * 10; // Placeholder

    } catch (error) {
      console.error('[ORBIT] Error collecting metrics:', error);
    }

    return metrics;
  }

  /**
   * Detect issues based on metrics
   */
  private async detectIssues(metrics: SystemMetrics): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Check memory usage
    if (metrics.memoryUsage > 90) {
      issues.push({
        id: `mem-${Date.now()}`,
        severity: 'critical',
        type: 'high_memory_usage',
        description: `Memory usage at ${metrics.memoryUsage.toFixed(2)}%`,
        component: 'system',
        detectedAt: Date.now(),
        autoFixable: true
      });
    } else if (metrics.memoryUsage > 80) {
      issues.push({
        id: `mem-${Date.now()}`,
        severity: 'high',
        type: 'elevated_memory_usage',
        description: `Memory usage at ${metrics.memoryUsage.toFixed(2)}%`,
        component: 'system',
        detectedAt: Date.now(),
        autoFixable: true
      });
    }

    // Check CPU usage
    if (metrics.cpuUsage > 90) {
      issues.push({
        id: `cpu-${Date.now()}`,
        severity: 'critical',
        type: 'high_cpu_usage',
        description: `CPU usage at ${metrics.cpuUsage.toFixed(2)}%`,
        component: 'system',
        detectedAt: Date.now(),
        autoFixable: false
      });
    }

    // Check API latency
    if (metrics.apiLatency > 5000) {
      issues.push({
        id: `latency-${Date.now()}`,
        severity: 'high',
        type: 'high_api_latency',
        description: `API latency at ${metrics.apiLatency.toFixed(0)}ms`,
        component: 'api',
        detectedAt: Date.now(),
        autoFixable: true
      });
    }

    // Check error rate
    if (metrics.errorRate > 5) {
      issues.push({
        id: `error-${Date.now()}`,
        severity: 'high',
        type: 'high_error_rate',
        description: `Error rate at ${metrics.errorRate.toFixed(2)}%`,
        component: 'api',
        detectedAt: Date.now(),
        autoFixable: true
      });
    }

    return issues;
  }

  /**
   * Calculate overall health status
   */
  private calculateStatus(issues: Issue[]): 'healthy' | 'degraded' | 'critical' {
    if (issues.length === 0) return 'healthy';
    
    const hasCritical = issues.some(issue => issue.severity === 'critical');
    if (hasCritical) return 'critical';

    const hasHigh = issues.some(issue => issue.severity === 'high');
    if (hasHigh) return 'degraded';

    return 'degraded';
  }

  /**
   * Initiate automated repairs
   */
  private async initiateRepairs(issues: Issue[]): Promise<void> {
    for (const issue of issues) {
      const repair: RepairAction = {
        issueId: issue.id,
        action: this.getRepairAction(issue.type),
        status: 'pending',
        startedAt: Date.now()
      };

      this.repairHistory.push(repair);

      try {
        repair.status = 'running';
        console.log(`[ORBIT] Executing repair: ${repair.action} for issue: ${issue.type}`);
        
        await this.executeRepair(issue);
        
        repair.status = 'success';
        repair.completedAt = Date.now();
        console.log(`[ORBIT] Repair successful: ${repair.action}`);
      } catch (error) {
        repair.status = 'failed';
        repair.completedAt = Date.now();
        repair.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ORBIT] Repair failed: ${repair.action}`, error);
      }
    }

    // Keep only last 100 repairs
    if (this.repairHistory.length > 100) {
      this.repairHistory = this.repairHistory.slice(-100);
    }
  }

  /**
   * Get repair action for issue type
   */
  private getRepairAction(issueType: string): string {
    const actionMap: Record<string, string> = {
      high_memory_usage: 'force_garbage_collection',
      elevated_memory_usage: 'clear_caches',
      high_api_latency: 'restart_slow_services',
      high_error_rate: 'restart_failed_services'
    };

    return actionMap[issueType] || 'investigate';
  }

  /**
   * Execute repair action
   */
  private async executeRepair(issue: Issue): Promise<void> {
    await this.actions.executeAction(issue.type, issue);
  }

  /**
   * Get current health status
   */
  getStatus(): {
    isRunning: boolean;
    currentHealth?: HealthCheck;
    recentRepairs: RepairAction[];
  } {
    return {
      isRunning: this.isRunning,
      currentHealth: this.healthHistory[this.healthHistory.length - 1],
      recentRepairs: this.repairHistory.slice(-10)
    };
  }

  /**
   * Get health history
   */
  getHealthHistory(limit: number = 10): HealthCheck[] {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Get repair history
   */
  getRepairHistory(limit: number = 10): RepairAction[] {
    return this.repairHistory.slice(-limit);
  }

  /**
   * Trigger manual repair
   */
  async manualRepair(issueType: string): Promise<boolean> {
    console.log(`[ORBIT] Manual repair triggered for: ${issueType}`);
    
    try {
      const issue: Issue = {
        id: `manual-${Date.now()}`,
        severity: 'medium',
        type: issueType,
        description: 'Manual repair request',
        component: 'manual',
        detectedAt: Date.now(),
        autoFixable: true
      };

      await this.initiateRepairs([issue]);
      return true;
    } catch (error) {
      console.error('[ORBIT] Manual repair failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const orbitEngine = new OrbitEngine();
