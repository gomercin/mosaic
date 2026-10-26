import test from 'node:test';
import assert from 'node:assert/strict';
import { allowDesignProfile, sensitiveDesignPath, designPreviewPlugin } from './design-preview.mjs';

test('design profile is restricted to same-origin loopback GET requests', () => {
  const request = { method: 'GET', headers: { host: '127.0.0.1:5186', origin: 'http://127.0.0.1:5186', 'sec-fetch-site': 'same-origin' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(allowDesignProfile(request), true);
  for (const change of [{ method: 'POST' }, { headers: { ...request.headers, origin: 'https://example.com' } }, { headers: { ...request.headers, host: 'example.com:5186' } }, { socket: { remoteAddress: '192.168.1.4' } }, { headers: { ...request.headers, 'sec-fetch-site': 'cross-site' } }]) assert.equal(allowDesignProfile({ ...request, ...change }), false);
});
test('private source paths are denied, including encoded paths', () => {
  for (const path of ['/.private-evidence/profile.json', '/%252eprivate-evidence/profile.json', '/@fs/root/.git/config', '/.env.local', '/_interview_raw_extracts/a.json', '/%ZZ']) assert.equal(sensitiveDesignPath(path), true);
  assert.equal(sensitiveDesignPath('/src/designs/main.tsx'), false);
});
test('enabled local profile fails closed in a build or network-bound server', () => {
  const plugin = designPreviewPlugin(true);
  assert.throws(() => plugin.configResolved({ command: 'build', server: { host: '127.0.0.1' } }));
  assert.throws(() => plugin.configResolved({ command: 'serve', server: { host: '0.0.0.0' } }));
  assert.doesNotThrow(() => plugin.configResolved({ command: 'serve', isPreview: false, root: '/tmp', server: { host: '127.0.0.1' } }));
});
