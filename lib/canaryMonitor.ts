export interface CanaryStatus {
  valid: boolean;
  lastUpdate: Date | null;
  daysOld: number;
  warnings: string[];
}

export async function checkWarrantCanary(): Promise<CanaryStatus> {
  try {
    const response = await fetch('/canary');
    if (!response.ok) {
      return {
        valid: false,
        lastUpdate: null,
        daysOld: Infinity,
        warnings: ['Canary page not accessible'],
      };
    }
    
    return {
      valid: true,
      lastUpdate: new Date(),
      daysOld: 0,
      warnings: [],
    };
  } catch (error) {
    return {
      valid: false,
      lastUpdate: null,
      daysOld: Infinity,
      warnings: [`Error: ${error}`],
    };
  }
}
