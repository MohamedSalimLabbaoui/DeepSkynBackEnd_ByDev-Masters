import { ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
declare const KeycloakAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class KeycloakAuthGuard extends KeycloakAuthGuard_base {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;
    handleRequest(err: any, user: any, info: any): any;
}
export {};
