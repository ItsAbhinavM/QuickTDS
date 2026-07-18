# Quick TDS Setup Guide

This guide covers how to install, configure, and connect to the Quick TDS MCP server.

## 💻 Installation

1. **Prerequisites:** Make sure you have [Node.js](https://nodejs.org/) v20+ installed.
2. **Clone & Install:**
   ```bash
   cd Quick-TDS-MCP
   npm install
   ```
3. **Environment Setup:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to configure OAuth requirements or custom ports.*

## 🚀 Running the Server

To start both the MCP Server (Node.js) and the Widget Development Server (Next.js) concurrently:
```bash
npm run dev
```

The console will output the active endpoints. It will automatically build and inline the Next.js widgets on startup.

## 🔌 Connecting AI Clients

The server exposes two different endpoints for different types of clients.

### 1. Standard Clients (Claude Desktop, ChatGPT, official MCP SDKs)
Use the **Legacy SSE** endpoint. This supports standard Server-Sent Events session negotiation.
👉 **URL:** `http://127.0.0.1:3100/sse`

### 2. NitroStack Clients (NitroStudio)
Use the **Streamable HTTP** endpoint. This is optimized for NitroStack environments.
👉 **URL:** `http://127.0.0.1:3100/mcp`

*(Note: The server includes middleware to automatically redirect standard SSE clients that accidentally hit `/mcp` to `/sse`, but configuring the correct URL directly is recommended).*

## 🔐 OAuth 2.1 Configuration

To enforce authentication, set `OAUTH_REQUIRED=true` in `.env`.
You must configure your Identity Provider:
- `RESOURCE_URI`: The URL identifying this server.
- `AUTH_SERVER_URL`: The URL of your OAuth server.
- `JWKS_URI` or `INTROSPECTION_ENDPOINT`: Required for token validation.

When enabled, the server rejects unauthenticated requests to protected endpoints.
