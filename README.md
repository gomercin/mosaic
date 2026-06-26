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

## Development

```bash
npm install
npm run dev
```

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
