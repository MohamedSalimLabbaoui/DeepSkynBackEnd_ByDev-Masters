import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SocialJwtStrategy extends PassportStrategy(Strategy, 'social-jwt') {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        if (!payload || !payload.sub) {
            throw new UnauthorizedException('Invalid private token');
        }

        // Return an object that matches what KeycloakStrategy.validate returns
        return {
            id: payload.sub,
            userId: payload.sub,
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            preferredUsername: payload.email, // Fallback
            givenName: payload.name?.split(' ')[0] || '',
            familyName: payload.name?.split(' ').slice(1).join(' ') || '',
            emailVerified: true,
            realmRoles: payload.roles || ['user'],
            resourceRoles: {},
        };
    }
}
