declare const _default: (() => {
    realm: string;
    'auth-server-url': string;
    'ssl-required': string;
    resource: string;
    'public-client': boolean;
    'bearer-only': boolean;
    'use-resource-role-mappings': boolean;
    credentials: {
        secret: string;
    };
    'confidential-port': number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    realm: string;
    'auth-server-url': string;
    'ssl-required': string;
    resource: string;
    'public-client': boolean;
    'bearer-only': boolean;
    'use-resource-role-mappings': boolean;
    credentials: {
        secret: string;
    };
    'confidential-port': number;
}>;
export default _default;
