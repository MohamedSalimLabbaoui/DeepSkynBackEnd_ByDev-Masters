"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abbrevSkinType = abbrevSkinType;
exports.abbrevConcerns = abbrevConcerns;
exports.compressWhitespace = compressWhitespace;
exports.buildCompactSkinContext = buildCompactSkinContext;
exports.buildCompactWeatherContext = buildCompactWeatherContext;
exports.buildCompactRoutineContext = buildCompactRoutineContext;
exports.compressWeatherForecast = compressWeatherForecast;
const SKIN_TYPE_ABBR = {
    oily: 'O',
    dry: 'D',
    combination: 'C',
    normal: 'N',
    sensitive: 'S',
    grasse: 'O',
    sèche: 'D',
    mixte: 'C',
    normale: 'N',
    sensible: 'S',
};
const BUDGET_ABBR = {
    low: 'L',
    medium: 'M',
    high: 'H',
    premium: 'P',
};
const CONCERN_ABBR = {
    acne: 'ac',
    wrinkles: 'wr',
    hyperpigmentation: 'hp',
    redness: 'rd',
    dryness: 'dr',
    oiliness: 'ol',
    sensitivity: 'sn',
    pores: 'pr',
    dark_spots: 'ds',
    fine_lines: 'fl',
    dehydration: 'dh',
};
function abbrevSkinType(skinType) {
    if (!skinType)
        return 'N';
    const lower = skinType.toLowerCase();
    return SKIN_TYPE_ABBR[lower] || skinType.charAt(0).toUpperCase();
}
function abbrevConcerns(concerns) {
    if (!concerns || concerns.length === 0)
        return '-';
    return concerns
        .map((c) => {
        const lower = c.toLowerCase();
        return CONCERN_ABBR[lower] || c.substring(0, 3);
    })
        .join(',');
}
function compressWhitespace(text) {
    return text
        .replace(/\n\s*\n/g, '\n')
        .replace(/^\s+/gm, '')
        .replace(/\s+$/gm, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
function buildCompactSkinContext(ctx) {
    const parts = [];
    if (ctx.skinType)
        parts.push(`st:${abbrevSkinType(ctx.skinType)}`);
    if (ctx.concerns?.length)
        parts.push(`c:${abbrevConcerns(ctx.concerns)}`);
    if (ctx.sensitivities?.length)
        parts.push(`s:${ctx.sensitivities.length}`);
    if (ctx.fitzpatrickType)
        parts.push(`f:${ctx.fitzpatrickType}`);
    if (ctx.conditions?.length)
        parts.push(`cd:${ctx.conditions.join(',')}`);
    return parts.join('|');
}
function buildCompactWeatherContext(ctx) {
    const parts = [];
    parts.push(`uv:${ctx.uvIndex}`);
    if (ctx.aqi != null)
        parts.push(`aq:${ctx.aqi}`);
    if (ctx.humidity != null)
        parts.push(`h:${ctx.humidity}`);
    if (ctx.temperature != null)
        parts.push(`t:${ctx.temperature}`);
    if (ctx.city)
        parts.push(`l:${ctx.city}`);
    return parts.join('|');
}
function buildCompactRoutineContext(ctx) {
    const parts = [];
    parts.push(`ty:${ctx.type}`);
    parts.push(`st:${abbrevSkinType(ctx.skinType)}`);
    if (ctx.concerns?.length)
        parts.push(`c:${abbrevConcerns(ctx.concerns)}`);
    if (ctx.sensitivities?.length)
        parts.push(`s:${ctx.sensitivities.length}`);
    if (ctx.budget)
        parts.push(`b:${BUDGET_ABBR[ctx.budget] || ctx.budget.charAt(0)}`);
    if (ctx.fitzpatrickType)
        parts.push(`f:${ctx.fitzpatrickType}`);
    return parts.join('|');
}
function compressWeatherForecast(daily) {
    const entries = [];
    for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
        entries.push(`${i + 1}:${daily.uv_index_max[i]},${daily.precipitation_sum[i]},${daily.temperature_2m_max[i]}`);
    }
    return entries.join('|');
}
//# sourceMappingURL=prompt-compression.util.js.map