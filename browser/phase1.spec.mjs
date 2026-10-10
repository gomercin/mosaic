import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const dataset = JSON.parse(await readFile(new URL('../public/data/mosaic.json', import.meta.url), 'utf8'));
const PIXEL_TOLERANCE = 1;

function responsiveControls(page, viewport) {
  const mobile = viewport.width <= 760;
  const area = mobile
    ? page.getByRole('region', { name: 'Capability reading view', exact: true })
    : page.getByRole('region', { name: 'Capability constellation', exact: true });
  return {
    mobile,
    area,
    capability: (label) => area.locator(mobile ? '.reading-capability-button' : '.constellation-capability').filter({ hasText: label }),
    project: (title) => area.getByRole('button', { name: `Select experience: ${title}`, exact: true }),
  };
}

async function geometry(page, mobile) {
  return page.evaluate(({ mobile, tolerance }) => {
    const rect = (element) => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { name: (element.getAttribute('aria-label') || element.textContent).trim().replace(/\s+/gu, ' '), x, y, width, height, right, bottom };
    };
    const visible = (element) => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
    const overlaps = (items) => {
      const result = [];
      for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
        const first = items[i]; const second = items[j];
        const width = Math.min(first.right, second.right) - Math.max(first.x, second.x);
        const height = Math.min(first.bottom, second.bottom) - Math.max(first.y, second.y);
        if (width > tolerance && height > tolerance) result.push({ first: first.name, second: second.name, width, height });
      }
      return result;
    };
    const outside = (inner, outer) => inner.x < outer.x - tolerance || inner.y < outer.y - tolerance || inner.right > outer.right + tolerance || inner.bottom > outer.bottom + tolerance;
    const container = document.querySelector(mobile ? '[aria-label="Capability reading view"]' : '.constellation-stage');
    const containerBounds = rect(container);
    const elements = [...container.querySelectorAll(mobile ? '.reading-capability-button,.reading-project-button' : '.constellation-capability,.constellation-experience')].filter(visible);
    const nodes = elements.map(rect);
    const cropped = nodes.filter((node) => outside(node, containerBounds));
    const clippedLabels = [];
    if (mobile) {
      for (const element of elements) {
        const bounds = rect(element);
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walker.nextNode())) {
          if (!textNode.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(textNode);
          for (const fragment of range.getClientRects()) if (outside(fragment, bounds)) clippedLabels.push({ button: bounds.name, text: textNode.textContent.trim() });
        }
      }
    }
    const core = document.querySelector('.constellation-core');
    const coreText = core && visible(core) ? [...core.children].filter(visible).map(rect) : [];
    return {
      container: containerBounds, nodes, overlaps: overlaps(nodes), cropped, clippedLabels,
      centerTextOverlaps: overlaps(coreText),
      centerTextOutside: coreText.length ? coreText.filter((child) => outside(child, rect(core))) : [],
      documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
    };
  }, { mobile, tolerance: PIXEL_TOLERANCE });
}

async function assertGeometry(page, controls, { capabilityId = null } = {}) {
  await expect(controls.area).toBeVisible();
  if (controls.mobile) await expect(page.locator('.constellation-stage')).toBeHidden();
  else await expect(page.getByRole('region', { name: 'Capability reading view', exact: true })).toBeHidden();
  const result = await geometry(page, controls.mobile);
  const expectedProjects = controls.mobile && capabilityId
    ? dataset.experiences.filter((record) => record.strengthenedCapabilities.includes(capabilityId))
    : dataset.experiences;
  expect(result.nodes.length).toBe(dataset.capabilities.length + expectedProjects.length);
  for (const project of expectedProjects) await expect(controls.project(project.title)).toHaveCount(1);
  expect(result.overlaps, 'Interactive capabilities and projects must be disjoint').toEqual([]);
  expect(result.cropped, 'Every interactive node must remain inside its container').toEqual([]);
  expect(result.clippedLabels, 'Mobile reading labels must be complete').toEqual([]);
  expect(result.centerTextOverlaps, 'Center text must not collide').toEqual([]);
  expect(result.centerTextOutside, 'Center text must remain inside the core').toEqual([]);
  expect(result.documentWidth).toBeLessThanOrEqual(result.viewportWidth + PIXEL_TOLERANCE);
  return result;
}

function story(page) {
  return page.getByRole('complementary', { name: 'Project story', exact: true });
}

async function assertEpisode(page, title) {
  const experience = dataset.experiences.find((record) => record.title === title);
  const episode = dataset.evidenceEpisodes.find((record) => record.experienceId === experience.id);
  const link = dataset.evidenceLinks.find((record) => record.episodeId === episode.id);
  const panel = story(page);
  await expect(panel.getByRole('heading', { name: title, exact: true })).toBeVisible();
  for (const [label, value] of [
    ['My contribution', episode.myContribution], ['Team / existing work', episode.teamContribution],
    ['AI assistance', episode.aiContribution], [`Result · ${episode.outcomeStatus}`, episode.result], ['Limitations', episode.limitation],
  ]) {
    await expect(panel.locator('dt').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'u') })).toHaveCount(1);
    await expect(panel.getByText(value, { exact: true })).toHaveCount(1);
  }
  await expect(panel.locator('.evidence-connection p')).toHaveText(link.explanation);
  await expect(panel.locator('.evidence-connection small')).toHaveText(`${link.signalType} · ${link.confidence} confidence · ${link.confirmedByUser ? 'User-confirmed' : 'Interpretation awaiting confirmation'}`);
  return { panel, episode, link };
}

async function capture(page, testInfo, name) {
  const target = process.env.MOSAIC_BROWSER_SCREENSHOT_DIR
    ? resolve(process.env.MOSAIC_BROWSER_SCREENSHOT_DIR, `${testInfo.project.name}-${name}.png`)
    : testInfo.outputPath(`${testInfo.project.name}-${name}.png`);
  await mkdir(dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: false, animations: 'disabled' });
  await testInfo.attach(name, { path: target, contentType: 'image/png' });
  return target;
}

async function artifactProvenance(testInfo, snapshots, measurements, browserVersion) {
  const assetNames = ['index.html', 'data/mosaic.json', ...await readdir('dist/assets').then((names) => names.sort().map((name) => `assets/${name}`))];
  const assets = await Promise.all(assetNames.map(async (name) => {
    const bytes = await readFile(resolve('dist', name));
    return { path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
  const report = {
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceWorktreeDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' }).trim()),
    project: testInfo.project.name, browser: 'chromium', browserVersion,
    viewport: testInfo.project.use.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce',
    baseURL: 'http://127.0.0.1:4178', assets,
    screenshots: Object.fromEntries(Object.entries(snapshots).map(([name, path]) => [name, basename(path)])), measurements,
  };
  const path = process.env.MOSAIC_BROWSER_SCREENSHOT_DIR
    ? resolve(process.env.MOSAIC_BROWSER_SCREENSHOT_DIR, `${testInfo.project.name}-verification.json`)
    : testInfo.outputPath(`${testInfo.project.name}-verification.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  await testInfo.attach('verification', { path, contentType: 'application/json' });
}

test('synthetic vertical slice preserves meaning, keyboard operation and responsive bounds', async ({ page, viewport, browser }, testInfo) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/data/mosaic.json'));
  await page.goto('/');
  expect(await (await responsePromise).json()).toEqual(dataset);
  await expect(page.getByText(/Synthetic demonstration/)).toBeVisible();
  const controls = responsiveControls(page, viewport);
  const snapshots = {}; const measurements = {};
  if (controls.mobile) await controls.area.evaluate((element) => window.scrollTo({ top: Math.max(0, scrollY + element.getBoundingClientRect().top - 24) }));
  measurements.overview = await assertGeometry(page, controls);
  snapshots.overview = await capture(page, testInfo, 'overview');

  const capability = controls.capability('Feedback inspection');
  await capability.focus(); await capability.press('Enter');
  const inspector = page.getByRole('complementary', { name: 'Connected projects inspector', exact: true });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await expect(inspector.getByRole('button', { name: /Checkpoint status view/u })).toBeVisible();
  await expect(inspector.getByRole('button', { name: /Handoff conversation/u })).toBeVisible();
  measurements.capability = await assertGeometry(page, controls, { capabilityId: 'feedback-inspection' });
  snapshots.capability = await capture(page, testInfo, 'capability');

  const engineering = inspector.getByRole('button', { name: /Checkpoint status view/u });
  await engineering.focus(); await engineering.press('Space');
  const engineeringEvidence = await assertEpisode(page, 'Checkpoint status view');
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await expect.poll(() => engineeringEvidence.panel.evaluate((element) => element.scrollTop)).toBe(0);
  const scrollSize = await engineeringEvidence.panel.evaluate((element) => ({ height: element.clientHeight, content: element.scrollHeight }));
  expect(scrollSize.content).toBeGreaterThan(scrollSize.height + 10);
  await engineeringEvidence.panel.hover();
  const beforeWindowScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => engineeringEvidence.panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(beforeWindowScroll);
  await engineeringEvidence.panel.evaluate((element) => { element.scrollTop = 0; });
  await engineeringEvidence.panel.focus();
  await expect(engineeringEvidence.panel).toBeFocused();
  const beforeKeyboardScroll = await page.evaluate(() => scrollY);
  await engineeringEvidence.panel.press('PageDown');
  await expect.poll(() => engineeringEvidence.panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(beforeKeyboardScroll);
  await engineeringEvidence.panel.locator('.evidence-connection').scrollIntoViewIfNeeded();
  await expect(engineeringEvidence.panel.locator('.evidence-connection')).toBeInViewport();
  snapshots['engineering-scrolled'] = await capture(page, testInfo, 'engineering-scrolled');
  await page.keyboard.press('Escape');
  await expect(story(page)).toHaveCount(0); await expect(capability).toBeFocused();

  await capability.press('Space');
  const stopped = inspector.getByRole('button', { name: /Handoff conversation/u });
  await stopped.focus(); await stopped.press('Enter');
  const stoppedEvidence = await assertEpisode(page, 'Handoff conversation');
  expect(stoppedEvidence.episode.outcomeStatus).toBe('stopped');
  await expect.poll(() => stoppedEvidence.panel.evaluate((element) => element.scrollTop)).toBe(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(capability).toBeFocused();

  const tentativeOpener = controls.project('Sensor comparison notebook');
  await tentativeOpener.focus(); await tentativeOpener.press('Enter');
  const tentative = await assertEpisode(page, 'Sensor comparison notebook');
  expect(tentative.episode.outcomeStatus).toBe('idea'); expect(tentative.link.signalType).toBe('candidate');
  expect(tentative.link.confidence).toBe('low'); expect(tentative.link.confirmedByUser).toBe(false);
  await expect.poll(() => tentative.panel.evaluate((element) => element.scrollTop)).toBe(0);
  await tentative.panel.locator('.evidence-connection').scrollIntoViewIfNeeded();
  measurements.tentative = await assertGeometry(page, controls);
  snapshots.tentative = await capture(page, testInfo, 'tentative');
  await page.keyboard.press('Escape'); await expect(tentativeOpener).toBeFocused();

  const timelineButton = page.getByRole('button', { name: 'Timeline', exact: true });
  await timelineButton.focus(); await timelineButton.press('Enter');
  const timeline = page.getByRole('region', { name: 'Experience timeline', exact: true });
  await expect(timeline).toBeVisible();
  const timelineProject = timeline.getByRole('button', { name: /Checkpoint status view/u });
  await timelineProject.focus(); await timelineProject.press('Space');
  await assertEpisode(page, 'Checkpoint status view');
  await timeline.scrollIntoViewIfNeeded();
  snapshots.timeline = await capture(page, testInfo, 'timeline');
  const overviewButton = page.getByRole('button', { name: 'Overview', exact: true });
  await overviewButton.focus(); await overviewButton.press('Enter');
  await expect(story(page).getByRole('heading', { name: 'Checkpoint status view', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(story(page)).toHaveCount(0);
  await expect(overviewButton).toBeFocused();
  await timelineButton.focus();
  await page.keyboard.press('Escape');
  await expect(timelineButton).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + PIXEL_TOLERANCE);
  expect(errors).toEqual([]);
  await artifactProvenance(testInfo, snapshots, measurements, browser.version());
});
