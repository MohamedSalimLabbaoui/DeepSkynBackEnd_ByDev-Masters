import { WeatherService } from './weather.service';
export declare class WeatherController {
    private weatherService;
    constructor(weatherService: WeatherService);
    getWeatherAdvice(body: {
        temperature: number;
        condition: string;
        humidity: number;
        windSpeed: number;
        uvIndex: number;
        city?: string;
        country?: string;
    }): Promise<{
        advice: string;
        emoji: string;
        urgency: "low" | "medium" | "high";
    }>;
    getLocation(): Promise<{
        latitude: number;
        longitude: number;
        city?: string;
        country?: string;
    }>;
    health(): Promise<{
        status: string;
        service: string;
    }>;
}
