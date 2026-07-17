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
    if (uiUrl) {
      server.getHttpTransport()?.getApp?.().get('/', (_request: unknown, response: { redirect(status: number, url: string): void }) => {
        response.redirect(302, uiUrl);
      });
    }
  } catch (error) {
    console.error('Failed to start Quick TDS MCP server:', error);
    process.exit(1);
  }
}

bootstrap();
