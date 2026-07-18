# Quick TDS Setup Guide

This guide covers how to install, configure, and connect to the Quick TDS MCP server.

## Installation

1. Prerequisites: Make sure you have Node.js v20 or higher installed.
2. Clone and Install:
   ```bash
   cd Quick-TDS-MCP
   npm install
   ```
3. Environment Setup:
   ```bash
   cp .env.example .env
   ```
   Edit .env to configure custom ports if needed.

## Running the Server

To start both the MCP Server (Node.js) and the Widget Development Server concurrently:
```bash
npm run dev
```

The console will output the active endpoints. It will automatically build and inline the NitroStack widgets on startup.

## Connecting AI Clients

The server exposes two different endpoints for different types of clients.

### 1. Standard Clients (Claude Desktop, ChatGPT, official MCP SDKs)
Use the Legacy SSE endpoint. This supports standard Server-Sent Events session negotiation.
URL: http://127.0.0.1:3100/sse

### 2. NitroStack Clients (NitroStudio)
Use the Streamable HTTP endpoint. This is optimized for NitroStack environments.
URL: http://127.0.0.1:3100/mcp

(Note: The server includes middleware to automatically redirect standard SSE clients that accidentally hit the Streamable HTTP endpoint to the Legacy SSE endpoint, but configuring the correct URL directly is recommended).
