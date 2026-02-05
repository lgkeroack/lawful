export interface ApiErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  extensions?: Record<string, unknown>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptimeSeconds: number;
  checks: {
    database: { status: 'up' | 'down'; latencyMs: number };
    storage: { status: 'up' | 'down'; latencyMs: number };
    cache: { status: 'up' | 'down'; latencyMs: number };
  };
}
