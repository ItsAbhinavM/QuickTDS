import { ConfigModule, McpApp, Module, OAuthModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { TdsModule } from './modules/tds/tds.module.js';

const isOauthEnabled = process.env.OAUTH_REQUIRED === 'true';

const imports = [
  ConfigModule.forRoot(),
  TdsModule
];

const providers: any[] = [SystemHealthCheck];

if (isOauthEnabled) {
  imports.push(
    OAuthModule.forRoot({
      required: true,
      resourceUri: process.env.RESOURCE_URI || 'http://localhost:3000',
      authorizationServers: [
        process.env.AUTH_SERVER_URL || 'http://localhost:8080/auth'
      ],
      scopesSupported: ['read', 'write', 'admin'],
      tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
      tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
      tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,
      audience: process.env.TOKEN_AUDIENCE,
      issuer: process.env.TOKEN_ISSUER
    }) as any
  );
} else {
  providers.push({
    provide: 'OAUTH_CONFIG',
    useValue: { required: false }
  });
}

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
  imports,
  providers
})
export class AppModule {}
