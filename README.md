# Mosaic

Mosaic is a static, data-driven capability atlas.

Instead of presenting a traditional portfolio, it maps experiences to capabilities, principles, and time so people can explore how someone thinks, learns, builds, coaches, and connects domains.

## Current scope

This first scaffold contains:

- a Vite + React + TypeScript frontend
- a sample `mosaic.sample.json` data file
- an overview / constellation-style capability view
- a timeline view
- a local Studio tab for drafting new experiences and exporting JSON
- GitHub Actions for CI, release package generation, and GitHub Pages deployment

## Development

Use Node.js 22, matching the GitHub Actions workflows:

```bash
nvm use
```

```bash
npm install
npm run dev
```

## Validate and build

```bash
npm test
npm run build
```

`npm test` runs TypeScript checks and validates the Mosaic sample data for duplicate IDs, required fields, and dangling capability/principle references.

## Build for static hosting

```bash
npm run build
```

Upload the generated `dist/` folder to any static host, including a Bluehost subfolder.

## Data model

The public app reads experience data from:

```txt
public/data/mosaic.sample.json
```

Later, this can be replaced by your own exported `mosaic.json` file.

## Editing workflow

1. Open the app locally.
2. Go to Studio.
3. Capture a rough experience story.
4. Create a draft experience.
5. Export JSON.
6. Replace the public data file before building/publishing.

The Studio is intentionally local-first. It does not require a backend, database, login, or WordPress integration.

## GitHub Actions

### CI

The CI workflow runs on pull requests, pushes to `main`, pushes to the scaffold branch, and manual dispatch.

It performs:

- dependency installation
- `npm test`
- `npm run build`
- upload of the `dist/` folder as a workflow artifact

### GitHub Pages

The Pages workflow runs on pushes to `main` and manual dispatch.

It performs:

- dependency installation
- `npm test`
- `npm run build`
- upload of the `dist/` folder as a GitHub Pages artifact
- deployment to GitHub Pages

If deployment fails with a Pages source or configuration error, open the repository settings and set the Pages build source to GitHub Actions.

After a successful deployment, the site should be available under the repository's GitHub Pages URL.

### Release

The release workflow runs when pushing a semantic version tag such as:

```bash
git tag v0.1.0
git push origin v0.1.0
```

It can also be started manually from the GitHub Actions tab.

It produces:

- a validated static build
- `mosaic-static-site.zip`
- a GitHub Release with the ZIP attached

That ZIP can be uploaded directly to a static hosting folder.
