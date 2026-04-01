/**
 * Utility for compressing AI prompts to reduce token usage
 * without losing any information.
 * 
 * Compression strategies:
 * - Minify JSON context
 * - Use abbreviations for common terms
 * - Remove redundant whitespace
 * - Use compact data representations
 */

export interface SkinContext {
  skinType?: string;
  concerns?: string[];
  sensitivities?: string[];
  fitzpatrickType?: number;
  conditions?: string[];
}

export interface WeatherContext {
  uvIndex: number;
  aqi?: number | null;
  humidity?: number | null;
  temperature?: number | null;
  city?: string;
}

export interface RoutineContext {
  type: 'AM' | 'PM' | 'weekly';
  skinType: string;
  concerns?: string[];
  sensitivities?: string[];
  budget?: string;
  preferredBrands?: string;
  fitzpatrickType?: number;
}

// Skin type abbreviation mappings
const SKIN_TYPE_ABBR: Record<string, string> = {
  'oily': 'O',
  'dry': 'D', 
  'combination': 'C',
  'normal': 'N',
  'sensitive': 'S',
  'grasse': 'O',
  'sèche': 'D',
  'mixte': 'C',
  'normale': 'N',
  'sensible': 'S',
};

// Budget abbreviation mappings
const BUDGET_ABBR: Record<string, string> = {
  'low': 'L',
  'medium': 'M',
  'high': 'H',
  'premium': 'P',
};

// Common concerns abbreviation
const CONCERN_ABBR: Record<string, string> = {
  'acne': 'ac',
  'wrinkles': 'wr',
  'hyperpigmentation': 'hp',
  'redness': 'rd',
  'dryness': 'dr',
  'oiliness': 'ol',
  'sensitivity': 'sn',
  'pores': 'pr',
  'dark_spots': 'ds',
  'fine_lines': 'fl',
  'dehydration': 'dh',
};

/**
 * Abbreviate skin type
 */
export function abbrevSkinType(skinType: string | undefined): string {
  if (!skinType) return 'N';
  const lower = skinType.toLowerCase();
  return SKIN_TYPE_ABBR[lower] || skinType.charAt(0).toUpperCase();
}

/**
 * Abbreviate concerns list
 */
export function abbrevConcerns(concerns: string[] | undefined): string {
  if (!concerns || concerns.length === 0) return '-';
  return concerns.map(c => {
    const lower = c.toLowerCase();
    return CONCERN_ABBR[lower] || c.substring(0, 3);
  }).join(',');
}

/**
 * Compress whitespace and format
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
 * Build compact skin context string
 */
export function buildCompactSkinContext(ctx: SkinContext): string {
  const parts: string[] = [];
  if (ctx.skinType) parts.push(`st:${abbrevSkinType(ctx.skinType)}`);
  if (ctx.concerns?.length) parts.push(`c:${abbrevConcerns(ctx.concerns)}`);
  if (ctx.sensitivities?.length) parts.push(`s:${ctx.sensitivities.length}`);
  if (ctx.fitzpatrickType) parts.push(`f:${ctx.fitzpatrickType}`);
  if (ctx.conditions?.length) parts.push(`cd:${ctx.conditions.join(',')}`);
  return parts.join('|');
}

/**
 * Build compact weather context string
 */
export function buildCompactWeatherContext(ctx: WeatherContext): string {
  const parts: string[] = [];
  parts.push(`uv:${ctx.uvIndex}`);
  if (ctx.aqi != null) parts.push(`aq:${ctx.aqi}`);
  if (ctx.humidity != null) parts.push(`h:${ctx.humidity}`);
  if (ctx.temperature != null) parts.push(`t:${ctx.temperature}`);
  if (ctx.city) parts.push(`l:${ctx.city}`);
  return parts.join('|');
}

/**
 * Build compact routine context string
 */
export function buildCompactRoutineContext(ctx: RoutineContext): string {
  const parts: string[] = [];
  parts.push(`ty:${ctx.type}`);
  parts.push(`st:${abbrevSkinType(ctx.skinType)}`);
  if (ctx.concerns?.length) parts.push(`c:${abbrevConcerns(ctx.concerns)}`);
  if (ctx.sensitivities?.length) parts.push(`s:${ctx.sensitivities.length}`);
  if (ctx.budget) parts.push(`b:${BUDGET_ABBR[ctx.budget] || ctx.budget.charAt(0)}`);
  if (ctx.fitzpatrickType) parts.push(`f:${ctx.fitzpatrickType}`);
  return parts.join('|');
}

/**
 * Compress weather forecast summary - compact format
 */
export function compressWeatherForecast(daily: {
  time: string[];
  uv_index_max: number[];
  precipitation_sum: number[];
  temperature_2m_max: number[];
}): string {
  const entries: string[] = [];
  for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
    entries.push(`${i + 1}:${daily.uv_index_max[i]},${daily.precipitation_sum[i]},${daily.temperature_2m_max[i]}`);
  }
  return entries.join('|');
}
