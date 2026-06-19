// Funcao serverless da Vercel que serve toda a API (/api/*) reutilizando a app
// Express definida em server.ts. A app Express e, ela propria, um handler (req,res).
import { buildApp } from '../server';

const app = buildApp();

export default app;
