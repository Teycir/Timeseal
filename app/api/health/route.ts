import { getCloudflareContext } from '@opennextjs/cloudflare';
import { jsonResponse } from '@/lib/apiHandler';
import { storageCircuitBreaker } from '@/lib/circuitBreaker';

export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    
    return jsonResponse({
      status: 'healthy',
      timestamp: Date.now(),
      version: '0.1.0',
      services: {
        storage: storageCircuitBreaker.getState(),
        database: env?.DB ? 'operational' : 'not configured',
        encryption: env?.MASTER_ENCRYPTION_KEY ? 'configured' : 'missing',
      },
    });
  } catch (error) {
    return jsonResponse({
      status: 'error',
      error: String(error),
    }, { status: 500 });
  }
}
