import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

export function sensitiveDesignPath(url = '') {
  try {
    let path = url.split('?')[0];
    for (let i = 0; i < 4; i++) path = decodeURIComponent(path);
    return /(?:^|[\\/])(?:\.private-evidence|_interview_raw_extracts|\.git|\.aws|\.codex|\.agents)(?:[\\/]|$)|(?:^|[\\/])\.env(?:\.|$)/i.test(path);
  } catch { return true; }
}
export function allowDesignProfile(request) {
  const host = request.headers.host;
  return /^127\.0\.0\.1:\d+$/.test(host ?? '')
    && ['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(request.socket.remoteAddress)
    && (!request.headers.origin || request.headers.origin === `http://${host}`)
    && (!request.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(request.headers['sec-fetch-site']))
    && request.method === 'GET';
}
export function designPreviewPlugin(enabled) {
  let root;
  let viteEnvironmentPath;
  return {
    name: 'local-design-profile',
    configResolved(config) {
      root = config.root;
      if (enabled && (config.command !== 'serve' || config.isPreview || config.server.host !== '127.0.0.1')) throw new Error('The local profile requires loopback development.');
    },
    configureServer(server) {
      // Vite's one built-in environment module may live in a managed checkout
      // whose parent is named .codex. Exempt this exact installed file only.
      viteEnvironmentPath = `/@fs${realpathSync(resolve(root, 'node_modules/vite/dist/client/env.mjs'))}`;
      server.middlewares.use((request, response, next) => {
        if (sensitiveDesignPath(request.url) && request.url?.split('?')[0] !== viteEnvironmentPath) { response.writeHead(404).end(); return; }
        if (request.url?.split('?')[0] !== '/__mosaic_design_profile') { next(); return; }
        if (!enabled || !allowDesignProfile(request)) { response.writeHead(404).end(); return; }
        try {
          const bytes = readFileSync(resolve(root, '.private-evidence/design-examples/profile.json'));
          const profile = JSON.parse(bytes);
          if (profile.private !== true || !profile.name || !Array.isArray(profile.cases)) throw new Error('Unexpected local profile');
          response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Referrer-Policy': 'no-referrer' }).end(bytes);
        } catch { response.writeHead(503).end('Local design profile unavailable.'); }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (sensitiveDesignPath(request.url) || request.url?.startsWith('/__mosaic_design_profile')) response.writeHead(404).end(); else next();
      });
    },
  };
}
