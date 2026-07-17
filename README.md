# Quick TDS MCP

An MCP application for detecting, evidencing, and tracking missing or mismatched TDS
credits. The product requirements and reconciliation rules are documented in `project.md`.

The NitroStack application lives in `quicktds/`.

```bash
cd quicktds
npm install
npm run dev
```
### If NitroStudio is not working
```
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

OAuth is optional for local development. See `quicktds/OAUTH_SETUP.md` before enabling it
for a deployment.

The complete application workflow, fixture formats, MCP tools, and production commands are
documented in `quicktds/README.md`.
