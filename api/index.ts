// Funcao serverless da Vercel: serve toda a API (/api/*) reutilizando a app
// Express de server.ts. Import dinamico + try/catch para expor erros de init
// em vez do crash generico FUNCTION_INVOCATION_FAILED.
import type { IncomingMessage, ServerResponse } from 'http';

let appPromise: Promise<(req: IncomingMessage, res: ServerResponse) => void> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!appPromise) {
      appPromise = import('../server').then((m) => m.buildApp() as unknown as (req: IncomingMessage, res: ServerResponse) => void);
    }
    const app = await appPromise;
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(e?.stack || e?.message || e) }));
  }
}
