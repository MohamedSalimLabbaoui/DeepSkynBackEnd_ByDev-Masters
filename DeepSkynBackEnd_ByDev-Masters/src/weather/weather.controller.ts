// Contrôleur backend pour la météo
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';

@Controller('api/weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  /**
   * Endpoint pour générer un conseil météo personnalisé
   * POST /api/weather/advice
   */
  @Post('advice')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard)
  async getWeatherAdvice(
    @Body()
    body: {
      temperature: number;
      condition: string;
      humidity: number;
      windSpeed: number;
      uvIndex: number;
      city?: string;
      country?: string;
    },
  ) {
    const advice = await this.weatherService.generateWeatherAdvice(body);
    return advice;
  }

  /**
   * Endpoint pour récupérer la localisation de l'utilisateur via IP
   * POST /api/weather/location
   * Évite les problèmes CORS du frontend
   */
  @Post('location')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KeycloakAuthGuard)
  async getLocation() {
    return await this.weatherService.getLocationFromIP();
  }

  /**
   * Endpoint de santé pour vérifier que le service est disponible
   * GET /api/weather/health
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    return { status: 'ok', service: 'weather' };
  }
}
