/**
 * Prompt compression utilities for contextual analysis service
 */

export function compressWhitespace(text: string): string {
  return text
    .replace(/\n\s*\n/g, '\n')
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function buildCompactWeatherContext(weather: {
  uvIndex: number;
  aqi?: number | null;
  humidity?: number | null;
  temperature?: number | null;
}, city?: string): string {
  const parts: string[] = [];
  parts.push(`uv:${weather.uvIndex}`);
  if (weather.aqi != null) parts.push(`aq:${weather.aqi}`);
  if (weather.humidity != null) parts.push(`h:${weather.humidity}`);
  if (weather.temperature != null) parts.push(`t:${weather.temperature}`);
  if (city) parts.push(`l:${city}`);
  return parts.join('|');
}

export function buildCompactSkinProfile(profile: {
  skinType?: string;
  concerns?: string[];
  fitzpatrickType?: number;
} | null): string {
  if (!profile) return '-';
  const parts: string[] = [];
  if (profile.skinType) parts.push(`st:${profile.skinType.charAt(0).toUpperCase()}`);
  if (profile.concerns?.length) parts.push(`c:${profile.concerns.slice(0, 3).join(',')}`);
  if (profile.fitzpatrickType) parts.push(`f:${profile.fitzpatrickType}`);
  return parts.join('|') || '-';
}
