# Quick TDS MCP

An MCP application for detecting, evidencing, and tracking missing or mismatched TDS
credits. The product requirements and reconciliation rules are documented in `project.md`.

The NitroStack application lives in `quicktds/`. Commands can be run from this
repository root:

```bash
npm install
npm run dev
```

After Next.js reports `Ready`, open **http://127.0.0.1:3101**. The MCP client
endpoint is **http://127.0.0.1:3100/mcp**; it is a streaming protocol endpoint,
not a browser page. Opening **http://127.0.0.1:3100** redirects to the UI.

To inspect the MCP tools without NitroStudio:

```bash
npm run inspector
```

The Inspector prints its own browser URL and authentication token. Do not open
the stdio child process or `/mcp` directly in a browser.

For a remote container or VM, expose the ports and run `HOST=0.0.0.0 npm run dev`.

OAuth is optional for local development. See `quicktds/OAUTH_SETUP.md` before enabling it
for a deployment.

The complete application workflow, fixture formats, MCP tools, and production commands are
documented in `quicktds/README.md`.
