import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class KeycloakGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      // Vérifier le token (sans vérifier la signature pour le développement)
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        throw new UnauthorizedException('Invalid token');
      }

      // Vérifier l'expiration
      const payload = decoded.payload as any;
      if (payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expired');
      }

      // Ajouter les infos du token à la requête
      request.user = { ...payload, accessToken: token };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer') {
      return null;
    }

    return token;
  }
}