"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressWhitespace = compressWhitespace;
exports.buildCompactWeatherContext = buildCompactWeatherContext;
exports.buildCompactSkinProfile = buildCompactSkinProfile;
function compressWhitespace(text) {
    return text
        .replace(/\n\s*\n/g, '\n')
        .replace(/^\s+/gm, '')
        .replace(/\s+$/gm, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
function buildCompactWeatherContext(weather, city) {
    const parts = [];
    parts.push(`uv:${weather.uvIndex}`);
    if (weather.aqi != null)
        parts.push(`aq:${weather.aqi}`);
    if (weather.humidity != null)
        parts.push(`h:${weather.humidity}`);
    if (weather.temperature != null)
        parts.push(`t:${weather.temperature}`);
    if (city)
        parts.push(`l:${city}`);
    return parts.join('|');
}
function buildCompactSkinProfile(profile) {
    if (!profile)
        return '-';
    const parts = [];
    if (profile.skinType)
        parts.push(`st:${profile.skinType.charAt(0).toUpperCase()}`);
    if (profile.concerns?.length)
        parts.push(`c:${profile.concerns.slice(0, 3).join(',')}`);
    if (profile.fitzpatrickType)
        parts.push(`f:${profile.fitzpatrickType}`);
    return parts.join('|') || '-';
}
//# sourceMappingURL=prompt-compression.util.js.map