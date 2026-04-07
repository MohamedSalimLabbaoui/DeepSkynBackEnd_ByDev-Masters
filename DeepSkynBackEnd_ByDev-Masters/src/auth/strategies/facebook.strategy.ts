import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

export interface FacebookProfile {
    facebookId: string;
    email: string;
    name: string;
    avatar: string;
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.get<string>('FACEBOOK_APP_ID'),
            clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
            callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
            scope: ['email', 'public_profile'],
            profileFields: ['id', 'emails', 'name', 'photos'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (err: any, user: any, info?: any) => void,
    ): Promise<any> {
        const { id, name, emails, photos } = profile;

        const user: FacebookProfile = {
            facebookId: id,
            email: emails?.[0]?.value || null,
            name: `${name.givenName} ${name.familyName}`,
            avatar: photos?.[0]?.value || null,
        };

        done(null, user);
    }
}
