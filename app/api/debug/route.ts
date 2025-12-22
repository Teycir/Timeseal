export const runtime = 'edge';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET() {
  const steps: string[] = [];
  
  try {
    steps.push('1. Route handler started');
    
    const { env } = await getCloudflareContext();
    steps.push('2. getCloudflareContext() succeeded');
    
    const hasDB = !!env?.DB;
    const hasKey = !!env?.MASTER_ENCRYPTION_KEY;
    steps.push(`3. Bindings - DB: ${hasDB}, KEY: ${hasKey}`);

    let dbStatus = 'not bound';
    let tables: string[] = [];
    
    if (env?.DB) {
      try {
        const result = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table'"
        ).all();
        tables = result.results?.map((r: any) => r.name) || [];
        dbStatus = `connected (${tables.length} tables)`;
        steps.push(`4. D1 query succeeded`);
      } catch (dbErr) {
        dbStatus = `query failed: ${dbErr}`;
        steps.push(`4. D1 query FAILED: ${dbErr}`);
      }
    }

    return Response.json({
      status: 'ok',
      steps,
      bindings: { DB: hasDB, MASTER_ENCRYPTION_KEY: hasKey },
      database: { status: dbStatus, tables },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      steps,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
