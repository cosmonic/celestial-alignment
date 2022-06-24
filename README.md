# Celestial Alignment

Formatting and code health for Cosmonic.

## Installing

```bash
npm i -D @cosmonic/celestial-alignment
```

## Usage

Run `npx align` to copy over the Prettier config files.

```bash
npx align
```

Add the following npm scripts to your `package.json`:

```
        "format": "npm run format:base -- --write",
        "format:base": "prettier \"./**/*.+(ts|tsx|json|html|css|md|js|jsx|yml|yaml)\"",
        "format:check": "npm run format:base -- --check",
```
