"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const axios_1 = require("axios");
let KeycloakStrategy = class KeycloakStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'keycloak') {
    constructor(configService, prisma) {
        const keycloakUrl = configService.get('keycloak.auth-server-url');
        const realm = configService.get('keycloak.realm');
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: async (request, rawJwtToken, done) => {
                try {
                    const publicKey = await this.getPublicKey();
                    done(null, publicKey);
                }
                catch (error) {
                    done(error, null);
                }
            },
            algorithms: ['RS256'],
        });
        this.configService = configService;
        this.prisma = prisma;
        this.keycloakUrl = keycloakUrl;
        this.realm = realm;
    }
    async getPublicKey() {
        try {
            const certsUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
            const response = await axios_1.default.get(certsUrl);
            const key = response.data.keys.find((k) => k.use === 'sig' && k.kty === 'RSA') || response.data.keys.find((k) => k.kty === 'RSA');
            if (key) {
                return this.jwkToPem(key);
            }
        }
        catch {
        }
        try {
            const realmUrl = `${this.keycloakUrl}/realms/${this.realm}`;
            const realmResponse = await axios_1.default.get(realmUrl);
            const publicKey = realmResponse.data.public_key;
            if (publicKey) {
                return `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
            }
            throw new Error('No public key found');
        }
        catch {
            throw new common_1.UnauthorizedException('Failed to get public key from Keycloak');
        }
    }
    jwkToPem(jwk) {
        const { n, e } = jwk;
        const modulus = Buffer.from(n, 'base64url');
        const exponent = Buffer.from(e, 'base64url');
        const sequence = (contents) => {
            const totalLength = contents.reduce((sum, c) => sum + c.length, 0);
            const header = Buffer.from([0x30, ...this.encodeLength(totalLength)]);
            return Buffer.concat([header, ...contents]);
        };
        const integer = (data) => {
            if (data[0] & 0x80) {
                data = Buffer.concat([Buffer.from([0x00]), data]);
            }
            const header = Buffer.from([0x02, ...this.encodeLength(data.length)]);
            return Buffer.concat([header, data]);
        };
        const rsaPublicKey = sequence([integer(modulus), integer(exponent)]);
        const algorithmIdentifier = Buffer.from([
            0x30,
            0x0d,
            0x06,
            0x09,
            0x2a,
            0x86,
            0x48,
            0x86,
            0xf7,
            0x0d,
            0x01,
            0x01,
            0x01,
            0x05,
            0x00,
        ]);
        const bitString = Buffer.concat([
            Buffer.from([0x03, ...this.encodeLength(rsaPublicKey.length + 1), 0x00]),
            rsaPublicKey,
        ]);
        const publicKeyInfo = sequence([algorithmIdentifier, bitString]);
        const base64 = publicKeyInfo.toString('base64');
        const pemLines = base64.match(/.{1,64}/g) || [];
        return `-----BEGIN PUBLIC KEY-----\n${pemLines.join('\n')}\n-----END PUBLIC KEY-----`;
    }
    encodeLength(length) {
        if (length < 128) {
            return [length];
        }
        const bytes = [];
        let temp = length;
        while (temp > 0) {
            bytes.unshift(temp & 0xff);
            temp >>= 8;
        }
        return [0x80 | bytes.length, ...bytes];
    }
    async validate(payload) {
        if (!payload || !payload.sub) {
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        let user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });
        if (!user && payload.email) {
            user = await this.prisma.user.findUnique({
                where: { email: payload.email },
            });
        }
        const userId = user?.id || payload.sub;
        return {
            ...(user || {}),
            id: userId,
            userId: userId,
            sub: userId,
            keycloakSub: payload.sub,
            email: user?.email || payload.email,
            name: user?.name || payload.name,
            preferredUsername: payload.preferred_username,
            givenName: payload.given_name,
            familyName: payload.family_name,
            emailVerified: payload.email_verified,
            realmRoles: payload.realm_access?.roles || [],
            resourceRoles: payload.resource_access || {},
        };
    }
};
exports.KeycloakStrategy = KeycloakStrategy;
exports.KeycloakStrategy = KeycloakStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], KeycloakStrategy);
//# sourceMappingURL=keycloak.strategy.js.map