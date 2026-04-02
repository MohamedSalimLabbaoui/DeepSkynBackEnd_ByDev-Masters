/**
 * Prompt compression utilities for predictive routine service
 */

export function compressWhitespace(text: string): string {
  return text
    .replace(/\n\s*\n/g, '\n')
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Compress weather forecast to compact format
 * Input: full daily data, Output: D1:uv,rain,temp|D2:uv,rain,temp|...
 */
export function compressWeatherForecast(daily: {
  time: string[];
  uv_index_max: number[];
  precipitation_sum: number[];
  temperature_2m_max: number[];
}): string {
  const entries: string[] = [];
  const dayNames = ['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'];
  
  for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
    const date = new Date(daily.time[i]);
    const dayIdx = date.getDay();
    const dayName = dayNames[dayIdx === 0 ? 6 : dayIdx - 1];
    const uv = Math.round(daily.uv_index_max[i]);
    const rain = Math.round(daily.precipitation_sum[i]);
    const temp = Math.round(daily.temperature_2m_max[i]);
    entries.push(`${dayName}${date.getDate()}:${uv},${rain},${temp}`);
  }
  return entries.join('|');
}

export function abbrevSkinType(skinType: string): string {
  const map: Record<string, string> = {
    'oily': 'O', 'dry': 'D', 'combination': 'C', 'normal': 'N', 'sensitive': 'S',
    'grasse': 'O', 'sèche': 'D', 'mixte': 'C', 'normale': 'N', 'sensible': 'S',
  };
  return map[skinType.toLowerCase()] || skinType.charAt(0).toUpperCase();
}
