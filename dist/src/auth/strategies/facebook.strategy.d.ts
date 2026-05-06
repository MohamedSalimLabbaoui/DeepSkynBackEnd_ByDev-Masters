import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
export interface FacebookProfile {
    facebookId: string;
    email: string;
    name: string;
    avatar: string;
}
declare const FacebookStrategy_base: new (...args: [options: import("passport-facebook").StrategyOptionsWithRequest] | [options: import("passport-facebook").StrategyOptions]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class FacebookStrategy extends FacebookStrategy_base {
    private readonly configService;
    constructor(configService: ConfigService);
    validate(accessToken: string, refreshToken: string, profile: any, done: (err: any, user: any, info?: any) => void): Promise<any>;
}
export {};
