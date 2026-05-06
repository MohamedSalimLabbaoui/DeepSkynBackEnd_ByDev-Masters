import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
declare const SocialJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class SocialJwtStrategy extends SocialJwtStrategy_base {
    private readonly configService;
    constructor(configService: ConfigService);
    validate(payload: any): Promise<{
        id: any;
        userId: any;
        sub: any;
        email: any;
        name: any;
        preferredUsername: any;
        givenName: any;
        familyName: any;
        emailVerified: boolean;
        realmRoles: any;
        resourceRoles: {};
    }>;
}
export {};
