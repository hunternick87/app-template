# create-app-template

An npm package that scaffolds Bun, React, TanStack Start, and Vite applications.

## Quick Start

Create a new project using npm or bun:

```bash
# Using npm
npm create app-template my-app

# Using bun
bun create app-template my-app

# Or without a project name (uses current directory)
npm create app-template
```

## Repository layout

- `cli/` — the published project generator.
- `template/` — the sole canonical base app copied into new projects.
- `generic/` — small, option-specific overlays used by the generator.

## Development

To install dependencies:

```bash
bun install
```

To run the generator locally:

```bash
bun cli/index.js my-app
```
