import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current authenticated user from the request
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(KeycloakAuthGuard)
 * async getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 * 
 * // Get specific property
 * @Get('email')
 * @UseGuards(KeycloakAuthGuard)
 * async getEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
