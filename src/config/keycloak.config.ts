import { registerAs } from '@nestjs/config';

export default registerAs('keycloak', () => ({
  realm: process.env.KEYCLOAK_REALM || 'master',
  'auth-server-url': process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8180',
  'ssl-required': process.env.KEYCLOAK_SSL_REQUIRED || 'external',
  resource: process.env.KEYCLOAK_RESOURCE || 'nestjs-app',
  'public-client': true,
  'bearer-only': true,
  'use-resource-role-mappings': true,
  credentials: {
    secret: process.env.KEYCLOAK_SECRET || '',
  },
  'confidential-port': 0,
}));