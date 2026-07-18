# Quick TDS MCP Server

Quick TDS is a high-performance **Model Context Protocol (MCP)** server built on top of the [@nitrostack/core](https://github.com/nitrostack) framework. It provides specialized AI agents with tools, resources, and UI widgets to streamline **Tax Deducted at Source (TDS) credit reconciliation and recovery workflows**. 

By leveraging MCP, Quick TDS enables large language models (LLMs) to perform complex tax data analysis, load corporate financial documents, identify discrepancies in Form 26AS, and directly render interactive reconciliation reports as rich UI widgets directly in the AI chat interface.

---

## 🚀 Features

- **Universal MCP Server:** Implemented using `@nitrostack/core`, providing robust lifecycle management, logging, and health checks.
- **Dual HTTP Transports:**
  - **Streamable HTTP** (`/mcp`): Optimized transport for modern MCP clients (like NitroStudio).
  - **Legacy SDK SSE** (`/sse`): Standard Server-Sent Events transport for broad compatibility with clients like Claude Desktop and ChatGPT.
- **Interactive UI Widgets:** Built with Next.js, these widgets are compiled and fully inlined (CSS & JS) into single, sandboxed HTML files, allowing rich user interfaces to be rendered securely inside any MCP client.
- **OAuth 2.1 Ready:** Built-in support for secure API authentication using JWTs and JWKS validation.

---

## 🛠️ Available MCP Capabilities

### Tools
AI Agents can call these tools to perform actions on behalf of the user:
- `load_quick_tds_demo`: Loads a comprehensive sample workspace (invoices, payments, bank receipts, and Form 26AS data) for testing.
- `get_tds_workspace`: Retrieves the current state of a TDS reconciliation workspace.
- `record_tds_correction`: Records a correction for a specific TDS discrepancy.
- `verify_refreshed_26as`: Verifies whether a refreshed Form 26AS matches the expected corrections.

### Resources & UI Widgets
The server dynamically provides rendered HTML widgets that the AI can display to the user:
- `ui://widget/next-upload-summary.html`: Displays an overview of uploaded financial documents.
- `ui://widget/next-reconciliation.html`: Shows a detailed reconciliation table matching books against Form 26AS.
- `ui://widget/next-recovery-cases.html`: Visualizes pending tax recovery cases and actionable steps.
- `ui://widget/next-resolution.html`: Displays resolution outcomes for corrected entries.

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher
- npm (comes with Node.js)

### Installation

1. Clone the repository and navigate into it:
   ```bash
   cd Quick-TDS-MCP
   ```

2. Install dependencies for the server:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Update the `.env` file with your specific ports or OAuth requirements if needed)*

### Running Locally

To start both the MCP Server and the Next.js Widget Development Server concurrently, run:

```bash
npm run dev
```

The console will output the active endpoints.

---

## 🔌 Connecting AI Clients (Claude, ChatGPT, etc.)

When configuring your AI client or MCP bridge, make sure you use the correct endpoint.

**For Standard Clients (Claude Desktop, ChatGPT, official MCP SDKs):**
Use the Legacy SSE endpoint:
👉 `http://127.0.0.1:3100/sse`

**For NitroStack Clients (NitroStudio):**
Use the Streamable HTTP endpoint:
👉 `http://127.0.0.1:3100/mcp`

> **Note:** If you experience a `Bad Request: no valid session ID provided` error in Claude or ChatGPT, you are likely using the `/mcp` endpoint instead of the required `/sse` endpoint. The server will now automatically attempt to redirect standard SSE traffic to the correct endpoint.

---

## 🏗️ Architecture & Development

This project consists of two tightly coupled components:
1. **The MCP Server (`src/`):** A TypeScript application built with NitroStack. It handles the core MCP protocol, tool execution, and resource serving.
2. **The Widgets App (`src/widgets/`):** A Next.js application that builds React components into static HTML.

### Post-Build Asset Inlining
Because MCP clients often render UI resources inside sandboxed `<iframe>` elements using `srcdoc`, external CSS and JavaScript files cannot be reliably loaded. 

To solve this, our build pipeline includes a custom script (`scripts/post-build-widgets.mjs`). When you build the widgets (`npm run build` inside `src/widgets`), this script automatically parses the Next.js HTML output and **inlines** all linked CSS stylesheets and JavaScript chunks directly into the `<head>` and `<body>` of the HTML. This ensures the widgets render perfectly styled, regardless of the client environment.

---

## 🔐 Security & OAuth

The server is equipped with enterprise-grade OAuth 2.1 integration.
To enable authentication, set `OAUTH_REQUIRED=true` in your `.env` file. You will need to provide your Identity Provider details (like `AUTH_SERVER_URL` and either `JWKS_URI` or `INTROSPECTION_ENDPOINT`).

When authentication is enabled, the server will enforce token validation on all protected endpoints, ensuring that only authorized users can access sensitive tax data.

---

## 📜 License
© 2026 NitroStack. All rights reserved.
