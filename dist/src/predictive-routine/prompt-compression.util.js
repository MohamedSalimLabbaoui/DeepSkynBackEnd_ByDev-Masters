"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressWhitespace = compressWhitespace;
exports.compressWeatherForecast = compressWeatherForecast;
exports.abbrevSkinType = abbrevSkinType;
function compressWhitespace(text) {
    return text
        .replace(/\n\s*\n/g, '\n')
        .replace(/^\s+/gm, '')
        .replace(/\s+$/gm, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
function compressWeatherForecast(daily) {
    const entries = [];
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
function abbrevSkinType(skinType) {
    const map = {
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
    return map[skinType.toLowerCase()] || skinType.charAt(0).toUpperCase();
}
//# sourceMappingURL=prompt-compression.util.js.map