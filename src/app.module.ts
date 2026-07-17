import { ConfigModule, McpApp, Module, OAuthModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { TdsModule } from './modules/tds/tds.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'quick-tds-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'MCP server for TDS credit reconciliation and recovery workflows',
  imports: [
    ConfigModule.forRoot(),
    TdsModule
  ],
  providers: [SystemHealthCheck]
})
export class AppModule {}
