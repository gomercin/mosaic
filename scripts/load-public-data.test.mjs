import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchPublicDataset } from '../src/data/loadPublicData.mjs';

async function dataset() {
  return JSON.parse(await readFile(new URL('../public/data/mosaic.json', import.meta.url), 'utf8'));
}

function response(value) {
  return async () => ({ ok: true, status: 200, json: async () => value });
}

test('loader fetches the given static-host subpath and validates the public model', async () => {
  const expected = await dataset();
  const urls = [];
  const actual = await fetchPublicDataset('/mosaic/data/mosaic.json', async (url) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => expected };
  });
  assert.deepEqual(actual, expected);
  assert.deepEqual(urls, ['/mosaic/data/mosaic.json']);
});

test('missing data and network errors fail with actionable errors without sample fallback', async () => {
  let calls = 0;
  await assert.rejects(fetchPublicDataset('./data/mosaic.json', async () => {
    calls += 1;
    return { ok: false, status: 404 };
  }), /HTTP 404.*Generate data\/mosaic.json/);
  assert.equal(calls, 1);
  await assert.rejects(fetchPublicDataset('./data/mosaic.json', async () => { throw new Error('offline'); }), /hosting base path and network/);
});

test('malformed JSON, unsupported version, broken references and private properties fail closed', async () => {
  await assert.rejects(fetchPublicDataset('data/mosaic.json', async () => ({ ok: true, json: async () => { throw new SyntaxError(); } })), /not valid JSON/);
  const wrongVersion = await dataset();
  wrongVersion.schemaVersion = '0.2';
  await assert.rejects(fetchPublicDataset('data/mosaic.json', response(wrongVersion)), /schemaVersion/);
  const brokenReference = await dataset();
  brokenReference.evidenceLinks[0].episodeId = 'missing-episode';
  await assert.rejects(fetchPublicDataset('data/mosaic.json', response(brokenReference)), /episodeId/);
  const privateField = await dataset();
  privateField.experiences[0].privateNotes = 'DO NOT SHIP';
  await assert.rejects(fetchPublicDataset('data/mosaic.json', response(privateField)), /privateNotes/);
});
