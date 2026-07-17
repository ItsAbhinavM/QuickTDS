# Quick TDS MCP Server

NitroStack MCP server for the TDS Credit Rescue Rail described in `../project.md`.

This base currently includes:

- MCP application bootstrap and health checks
- Optional OAuth 2.1 configuration
- A clean Next.js widget workspace
- No domain tools yet; TDS features can be added under `src/modules/`

## Setup

```bash
npm install
npm run install:all
cp .env.example .env
npm run dev
```

OAuth is disabled by default for local development. Set `OAUTH_REQUIRED=true` only after
configuring a token verifier. See `OAUTH_SETUP.md` for details.

## Commands

```bash
npm run dev
npm run build
npm start
npm run widget -- run dev
npm run widget -- run build
```
