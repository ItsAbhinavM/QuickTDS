# Quick TDS MCP Server

Quick TDS is a high-performance **Model Context Protocol (MCP)** server built on top of the [@nitrostack/core](https://github.com/nitrostack) framework. It provides specialized AI agents with tools, resources, and UI widgets to streamline **Tax Deducted at Source (TDS) credit reconciliation and recovery workflows**.

By leveraging MCP, Quick TDS enables large language models (LLMs) to perform complex tax data analysis, load corporate financial documents, identify discrepancies in Form 26AS, and directly render interactive reconciliation reports as rich UI widgets directly in the AI chat interface.

---

## 🗺️ Architecture Map

The Quick TDS MCP Server connects AI clients to rich backend tax reconciliation services while serving dynamic, self-contained UI widgets.

```mermaid
graph TD
    %% AI Clients
    subgraph "AI Interfaces"
        Claude[Claude Desktop / ChatGPT]
        Nitro[NitroStudio]
    end

    %% MCP Transport Layer
    subgraph "MCP Transport Layer (Port 3100)"
        SSE[Legacy SSE Endpoint\n/sse]
        MCP_Stream[Streamable HTTP\n/mcp]
        Middleware{Auto-Redirect\nMiddleware}
    end

    %% Core Application
    subgraph "Quick TDS Core"
        Tools[TDS Tools Engine\n(Reconciliation, Validation)]
        Resources[Resource Manager\n(Health, UI Links)]
        Auth[OAuth 2.1 Gatekeeper]
    end

    %% UI Widgets
    subgraph "Next.js UI Engine (Port 3101)"
        NextJS[Next.js Static Export]
        Inliner[Asset Inliner Script]
        HTML_Widgets[Self-Contained\nHTML Widgets]
    end

    %% Connections
    Claude -->|Standard SSE| SSE
    Claude -.->|Accidental Request| MCP_Stream
    Nitro -->|Streamable HTTP| MCP_Stream
    
    MCP_Stream --> Middleware
    Middleware -.->|Redirects SSE Clients| SSE
    
    SSE <--> Auth
    MCP_Stream <--> Auth
    
    Auth <--> Tools
    Auth <--> Resources
    
    NextJS -->|Post-Build| Inliner
    Inliner -->|Injects CSS & JS| HTML_Widgets
    
    Resources -->|Serves ui://| HTML_Widgets
```

---

## 🌟 Core Capabilities

Quick TDS bridges the gap between raw financial data and AI-driven insights by providing structural tools and visual resources.

### 🛠️ Intelligent Tools
AI Agents can call these tools to perform actions on behalf of the user, enabling autonomous reconciliation:
* **`load_quick_tds_demo`**: Bootstraps the environment with a comprehensive sample workspace, loading simulated invoices, payments, bank receipts, and Form 26AS data for testing.
* **`get_tds_workspace`**: Retrieves the current state of a TDS reconciliation workspace for the AI to analyze.
* **`record_tds_correction`**: Allows the AI to record a correction for a specific TDS discrepancy found in the books.
* **`verify_refreshed_26as`**: Verifies whether a newly fetched Form 26AS matches the expected corrections and updates the status.

### 📊 Interactive UI Resources
The server dynamically provides rendered HTML widgets that the AI can seamlessly display to the user, providing a rich visual experience beyond text:
* **`ui://widget/next-upload-summary.html`**: A visual dashboard displaying an overview of uploaded corporate financial documents.
* **`ui://widget/next-reconciliation.html`**: An interactive reconciliation table matching internal company books against government Form 26AS data.
* **`ui://widget/next-recovery-cases.html`**: A detailed view of pending tax recovery cases, highlighting discrepancies and actionable steps.
* **`ui://widget/next-resolution.html`**: Displays resolution outcomes and final statuses for corrected tax entries.

---

## 🏗️ Technical Design

This project consists of two tightly coupled components designed for maximum compatibility with sandboxed MCP clients:

1. **The MCP Server Engine:** A robust TypeScript application built with NitroStack. It handles the core MCP protocol, executes tools, validates OAuth 2.1 JWTs, and routes UI resources.
2. **The Widget Rendering Engine:** A Next.js application that builds React components into static HTML. Because MCP clients often render UI resources inside restricted `<iframe>` elements (using `srcdoc`), external CSS and JavaScript files cannot be reliably loaded. Our custom post-build pipeline (`scripts/post-build-widgets.mjs`) automatically parses the Next.js output and **inlines all linked stylesheets and JavaScript chunks directly into the HTML**. This guarantees that the widgets render perfectly styled in any AI chat interface.

---

## 📖 Setup & Installation

Please refer to the [**Setup Guide (`setup.md`)**](./setup.md) for detailed instructions on:
- Installation prerequisites
- Environment configuration
- Running the dual-server environment
- Connecting specific AI clients using the correct endpoints
- Configuring the enterprise OAuth 2.1 gatekeeper

---

## 📜 License
© 2026 NitroStack. All rights reserved.
