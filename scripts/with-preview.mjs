// Lance `vite preview` sur dist/ (port 4173), exécute un script Node, puis arrête le serveur.
// Usage : node scripts/with-preview.mjs scripts/e2e.mjs   (après npm run build)
// Évite de lancer/arrêter le serveur à la main ; le code de sortie est celui du script.

import { spawn } from 'node:child_process';
import { preview } from 'vite';

const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error('Usage : node scripts/with-preview.mjs <script.mjs> [args…]');
  process.exit(2);
}

const server = await preview({ preview: { port: 4173, strictPort: true }, logLevel: 'warn' });
const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit', env: { ...process.env, URL: 'http://localhost:4173/' } });
const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c ?? 1)));
await server.close();
process.exit(code);
