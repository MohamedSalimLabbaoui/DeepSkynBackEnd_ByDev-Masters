import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  private readonly keycloakUrl: string;
  private readonly realm: string;

  constructor(private readonly configService: ConfigService) {
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
      const certsUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
      const response = await axios.get(certsUrl);
      
      // Find the RSA key used for signing
      const key = response.data.keys.find(
        (k: any) => k.use === 'sig' && k.kty === 'RSA',
      );

      if (!key) {
        throw new Error('No signing key found');
      }

      // Convert JWK to PEM format
      return this.jwkToPem(key);
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

    const rsaPublicKey = sequence([
      integer(modulus),
      integer(exponent),
    ]);

    // Wrap in SEQUENCE with algorithm identifier
    const algorithmIdentifier = Buffer.from([
      0x30, 0x0d, // SEQUENCE
      0x06, 0x09, // OBJECT IDENTIFIER
      0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // rsaEncryption
      0x05, 0x00, // NULL
    ]);

    const bitString = Buffer.concat([
      Buffer.from([0x03, ...this.encodeLength(rsaPublicKey.length + 1), 0x00]),
      rsaPublicKey,
    ]);

    const publicKeyInfo = sequence([
      algorithmIdentifier,
      bitString,
    ]);

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

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      preferredUsername: payload.preferred_username,
      givenName: payload.given_name,
      familyName: payload.family_name,
      emailVerified: payload.email_verified,
      realmRoles: payload.realm_access?.roles || [],
      resourceRoles: payload.resource_access || {},
    };
  }
}
