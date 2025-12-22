// Multi-Party Time Attestation
// Verifies Cloudflare time against external sources

export interface TimeAttestation {
  cloudflareTime: number;
  externalTime: number;
  skew: number;
  trusted: boolean;
  sources: string[];
}

const EXTERNAL_TIME_SOURCES = [
  'https://worldtimeapi.org/api/timezone/Etc/UTC',
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
];

export async function getAttestedTime(): Promise<TimeAttestation> {
  const cloudflareTime = Date.now();
  
  const externalTimes = await Promise.allSettled(
    EXTERNAL_TIME_SOURCES.map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      try {
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        return new Date(data.datetime || data.dateTime).getTime();
      } finally {
        clearTimeout(timeout);
      }
    })
  );
  
  const validTimes = externalTimes
    .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
    .map(r => r.value);
  
  const externalTime = validTimes.length > 0
    ? Math.floor(validTimes.reduce((a, b) => a + b) / validTimes.length)
    : cloudflareTime;
  
  const skew = Math.abs(cloudflareTime - externalTime);
  const trusted = skew < 5000; // 5 second tolerance
  
  return {
    cloudflareTime,
    externalTime,
    skew,
    trusted,
    sources: EXTERNAL_TIME_SOURCES,
  };
}
