#!/usr/bin/env node

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  try {
    console.error('Starting Quick TDS MCP server...\n');

    if (!process.env.RESOURCE_URI || !process.env.AUTH_SERVER_URL) {
      console.error('Warning: RESOURCE_URI or AUTH_SERVER_URL is not configured.');
      console.error('Using local defaults. Copy .env.example to .env to configure OAuth.\n');
      process.env.RESOURCE_URI ||= 'http://localhost:3000';
      process.env.AUTH_SERVER_URL ||= 'http://localhost:8080/auth';
    }

    process.env.NITROSTACK_APP_MODE ??= 'universal';
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();

    const uiUrl = process.env.QUICK_TDS_UI_URL;
    const app = server.getHttpTransport()?.getApp?.();
    if (app) {
      // Intercept standard clients hitting /mcp and redirect them to /sse
      app.use('/mcp', (req: any, res: any, next: any) => {
        // If it's a GET request expecting text/event-stream, it's likely a standard SSE client
        if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/event-stream')) {
          return res.redirect(307, '/sse');
        }
        // If it's a POST request from a standard client without a session ID in the body but with it in the query
        if (req.method === 'POST' && req.query.sessionId) {
          req.url = req.url.replace('/mcp', '/sse'); // rewrite internal URL
          return app.handle(req, res); // pass to express router
        }
        next();
      });

      if (uiUrl) {
        app.get('/', (_request: unknown, response: { redirect(status: number, url: string): void }) => {
          response.redirect(302, uiUrl);
        });
      }
    }
  } catch (error) {
    console.error('Failed to start Quick TDS MCP server:', error);
    process.exit(1);
  }
}

bootstrap();
