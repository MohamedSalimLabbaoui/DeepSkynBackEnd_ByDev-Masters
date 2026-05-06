"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('keycloak', () => ({
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
//# sourceMappingURL=keycloak.config.js.map