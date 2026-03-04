import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * @param roles - Array of role names required to access the route
 *
 * @example
 * ```typescript
 * @Roles('admin')
 * @UseGuards(KeycloakAuthGuard, RolesGuard)
 * async adminEndpoint() { }
 *
 * @Roles('admin', 'manager')
 * @UseGuards(KeycloakAuthGuard, RolesGuard)
 * async adminOrManagerEndpoint() { }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
