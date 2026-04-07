import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  private readonly keycloakUrl: string;
  private readonly realm: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const keycloakUrl = configService.get<string>('keycloak.auth-server-url');
    const realm = configService.get<string>('keycloak.realm');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, rawJwtToken, done) => {
        try {
          const publicKey = await this.getPublicKey();
          done(null, publicKey);
        } catch (error) {
          done(error, null);
        }
      },
      algorithms: ['RS256'],
    });

    this.keycloakUrl = keycloakUrl;
    this.realm = realm;
  }

  /**
   * Get public key from Keycloak for JWT verification
   */
  private async getPublicKey(): Promise<string> {
    try {
      // First try JWKS endpoint
      const certsUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
      const response = await axios.get(certsUrl);

      // Find the RSA key used for signing (prefer 'sig', fallback to any RSA key)
      const key =
        response.data.keys.find(
          (k: any) => k.use === 'sig' && k.kty === 'RSA',
        ) ||
        response.data.keys.find((k: any) => k.kty === 'RSA');

      if (key) {
        return this.jwkToPem(key);
      }
    } catch {
      // Fall through to realm public key
    }

    try {
      // Fallback: use the realm's public key directly
      const realmUrl = `${this.keycloakUrl}/realms/${this.realm}`;
      const realmResponse = await axios.get(realmUrl);
      const publicKey = realmResponse.data.public_key;

      if (publicKey) {
        return `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      }

      throw new Error('No public key found');
    } catch (error) {
      throw new UnauthorizedException('Failed to get public key from Keycloak');
    }
  }

  /**
   * Convert JWK to PEM format
   */
  private jwkToPem(jwk: any): string {
    const { n, e } = jwk;

    // Base64url decode
    const modulus = Buffer.from(n, 'base64url');
    const exponent = Buffer.from(e, 'base64url');

    // Build RSA public key in DER format
    const modulusLength = modulus.length;
    const exponentLength = exponent.length;

    // ASN.1 encoding
    const sequence = (contents: Buffer[]): Buffer => {
      const totalLength = contents.reduce((sum, c) => sum + c.length, 0);
      const header = Buffer.from([0x30, ...this.encodeLength(totalLength)]);
      return Buffer.concat([header, ...contents]);
    };

    const integer = (data: Buffer): Buffer => {
      // Add leading zero if high bit is set
      if (data[0] & 0x80) {
        data = Buffer.concat([Buffer.from([0x00]), data]);
      }
      const header = Buffer.from([0x02, ...this.encodeLength(data.length)]);
      return Buffer.concat([header, data]);
    };

    const rsaPublicKey = sequence([integer(modulus), integer(exponent)]);

    // Wrap in SEQUENCE with algorithm identifier
    const algorithmIdentifier = Buffer.from([
      0x30,
      0x0d, // SEQUENCE
      0x06,
      0x09, // OBJECT IDENTIFIER
      0x2a,
      0x86,
      0x48,
      0x86,
      0xf7,
      0x0d,
      0x01,
      0x01,
      0x01, // rsaEncryption
      0x05,
      0x00, // NULL
    ]);

    const bitString = Buffer.concat([
      Buffer.from([0x03, ...this.encodeLength(rsaPublicKey.length + 1), 0x00]),
      rsaPublicKey,
    ]);

    const publicKeyInfo = sequence([algorithmIdentifier, bitString]);

    // Convert to PEM
    const base64 = publicKeyInfo.toString('base64');
    const pemLines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN PUBLIC KEY-----\n${pemLines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Encode ASN.1 length
   */
  private encodeLength(length: number): number[] {
    if (length < 128) {
      return [length];
    }
    const bytes: number[] = [];
    let temp = length;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    return [0x80 | bytes.length, ...bytes];
  }

  /**
   * Validate the JWT payload
   */
  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Attempt to find user in Prisma
    let user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user && payload.email) {
      user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });
    }

    // Return an object that matches what KeycloakStrategy.validate returns
    // We map the Prisma ID to 'sub', 'userId', and 'id' to maintain backward compatibility
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
}
