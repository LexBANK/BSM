/**
 * ORBIT Worker
 * Handles background monitoring and integration with GitHub Actions
 * Uses repository_dispatch events for automated healing workflows
 */

import type { Issue } from './orbit.engine.js';

export interface WorkerConfig {
  githubToken?: string;
  githubRepo?: string;
  webhookUrl?: string;
  enableNotifications?: boolean;
}

export interface DispatchPayload {
  event_type: string;
  client_payload: {
    issue: Issue;
    timestamp: number;
    action: string;
  };
}

export class OrbitWorker {
  private config: WorkerConfig;
  private isInitialized: boolean = false;

  constructor(config?: WorkerConfig) {
    this.config = {
      githubRepo: process.env.GITHUB_REPO || 'OWNER/REPO',
      githubToken: process.env.GITHUB_TOKEN,
      webhookUrl: process.env.ORBIT_WEBHOOK_URL,
      enableNotifications: process.env.ORBIT_NOTIFICATIONS === 'true',
      ...config
    };
  }

  /**
   * Initialize worker with GitHub integration
   */
  async initialize(): Promise<void> {
    console.log('[ORBIT Worker] Initializing...');
    
    if (!this.config.githubToken && process.env.NODE_ENV === 'production') {
      console.warn('[ORBIT Worker] No GitHub token configured - repository_dispatch disabled');
    }

    if (!this.config.githubRepo || this.config.githubRepo === 'OWNER/REPO') {
      console.warn('[ORBIT Worker] GitHub repository not configured - using placeholder OWNER/REPO');
    }

    this.isInitialized = true;
    console.log('[ORBIT Worker] Initialized');
  }

  /**
   * Dispatch event to GitHub Actions via repository_dispatch
   */
  async dispatchToGitHub(issue: Issue, action: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.config.githubToken) {
      console.log('[ORBIT Worker] GitHub dispatch skipped - no token configured');
      return false;
    }

    try {
      const [owner, repo] = this.config.githubRepo!.split('/');
      const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

      const payload: DispatchPayload = {
        event_type: 'orbit_actions',
        client_payload: {
          issue,
          timestamp: Date.now(),
          action
        }
      };

      console.log(`[ORBIT Worker] Dispatching to GitHub: ${url}`);
      console.log(`[ORBIT Worker] Event: orbit_actions, Issue: ${issue.type}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${this.config.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      console.log('[ORBIT Worker] Dispatch successful');
      return true;

    } catch (error) {
      console.error('[ORBIT Worker] Dispatch failed:', error);
      return false;
    }
  }

  /**
   * Send notification webhook
   */
  async sendNotification(issue: Issue, action: string, status: string): Promise<void> {
    if (!this.config.enableNotifications || !this.config.webhookUrl) {
      return;
    }

    try {
      const notification = {
        type: 'orbit_notification',
        issue: {
          id: issue.id,
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          component: issue.component
        },
        action,
        status,
        timestamp: Date.now()
      };

      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      });

      console.log('[ORBIT Worker] Notification sent');
    } catch (error) {
      console.error('[ORBIT Worker] Notification failed:', error);
    }
  }

  /**
   * Monitor external services
   */
  async monitorServices(): Promise<{
    healthy: string[];
    unhealthy: string[];
  }> {
    const services = ['api', 'database', 'cache', 'storage'];
    const healthy: string[] = [];
    const unhealthy: string[] = [];

    for (const service of services) {
      const isHealthy = await this.checkServiceHealth(service);
      if (isHealthy) {
        healthy.push(service);
      } else {
        unhealthy.push(service);
      }
    }

    return { healthy, unhealthy };
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(service: string): Promise<boolean> {
    // Placeholder - would implement actual health checks
    // In production, this would ping service endpoints
    console.log(`[ORBIT Worker] Checking ${service} health...`);
    return Math.random() > 0.1; // 90% healthy rate
  }

  /**
   * Trigger workflow run
   */
  async triggerWorkflow(workflowId: string, inputs?: Record<string, any>): Promise<boolean> {
    if (!this.config.githubToken) {
      console.log('[ORBIT Worker] Workflow trigger skipped - no token configured');
      return false;
    }

    try {
      const [owner, repo] = this.config.githubRepo!.split('/');
      const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

      console.log(`[ORBIT Worker] Triggering workflow: ${workflowId}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${this.config.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: inputs || {}
        })
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      console.log('[ORBIT Worker] Workflow triggered successfully');
      return true;

    } catch (error) {
      console.error('[ORBIT Worker] Workflow trigger failed:', error);
      return false;
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    initialized: boolean;
    githubIntegration: boolean;
    webhookIntegration: boolean;
    repository: string;
  } {
    return {
      initialized: this.isInitialized,
      githubIntegration: !!this.config.githubToken,
      webhookIntegration: !!this.config.webhookUrl,
      repository: this.config.githubRepo || 'OWNER/REPO'
    };
  }
}
