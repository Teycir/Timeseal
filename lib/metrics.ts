// Metrics Collection
interface Metrics {
  sealsCreated: number;
  sealsUnlocked: number;
  pulsesReceived: number;
  failedUnlocks: number;
  lastReset: number;
}

interface NonCriticalFailures {
  analytics: number;
  accessCount: number;
  auditLog: number;
  rollbackBlob: number;
  rollbackDb: number;
  blobDeletion: number;
  observability: number;
}

class MetricsCollector {
  private metrics: Metrics = {
    sealsCreated: 0,
    sealsUnlocked: 0,
    pulsesReceived: 0,
    failedUnlocks: 0,
    lastReset: Date.now(),
  };

  private nonCriticalFailures: NonCriticalFailures = {
    analytics: 0,
    accessCount: 0,
    auditLog: 0,
    rollbackBlob: 0,
    rollbackDb: 0,
    blobDeletion: 0,
    observability: 0,
  };

  incrementSealCreated(): void {
    this.metrics.sealsCreated++;
  }

  incrementSealUnlocked(): void {
    this.metrics.sealsUnlocked++;
  }

  incrementPulseReceived(): void {
    this.metrics.pulsesReceived++;
  }

  incrementFailedUnlock(): void {
    this.metrics.failedUnlocks++;
  }

  incrementNonCriticalFailure(type: keyof NonCriticalFailures): void {
    this.nonCriticalFailures[type]++;
  }

  getNonCriticalFailures(): NonCriticalFailures {
    return { ...this.nonCriticalFailures };
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  hasHighFailureRate(): boolean {
    const total = Object.values(this.nonCriticalFailures).reduce((a, b) => a + b, 0);
    return total > 100;
  }

  reset(): void {
    this.metrics = {
      sealsCreated: 0,
      sealsUnlocked: 0,
      pulsesReceived: 0,
      failedUnlocks: 0,
      lastReset: Date.now(),
    };
    this.nonCriticalFailures = {
      analytics: 0,
      accessCount: 0,
      auditLog: 0,
      rollbackBlob: 0,
      rollbackDb: 0,
      blobDeletion: 0,
      observability: 0,
    };
  }
}

export const metrics = new MetricsCollector();

// Metrics endpoint handler
export function handleMetricsRequest(): Response {
  const data = metrics.getMetrics();
  const uptime = Date.now() - data.lastReset;
  
  return new Response(
    JSON.stringify({
      ...data,
      uptimeMs: uptime,
      rates: {
        sealsPerHour: (data.sealsCreated / uptime) * 3600000,
        unlocksPerHour: (data.sealsUnlocked / uptime) * 3600000,
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
