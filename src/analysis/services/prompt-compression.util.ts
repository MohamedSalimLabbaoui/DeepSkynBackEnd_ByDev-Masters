/**
 * Prompt compression utilities for Gemini service
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
 * Compressed analysis prompt for skin image analysis
 * Reduces ~50% tokens while maintaining all required output fields
 */
export function buildCompactAnalysisPrompt(questionnaire?: Record<string, any>): string {
  const base = compressWhitespace(`
Dermatologist AI. Analyze skin images.
JSON only:{
skinType:dry|oily|combination|normal|sensitive,
skinAge:number,healthScore:0-100,
conditions:[],concerns:[],
recommendations:{products:[],ingredients:[],lifestyle:[],warnings:[]},
detailedAnalysis:{
hydration:{score,description},texture:{score,description},
pores:{score,description},pigmentation:{score,description},
wrinkles:{score,description},acne:{score,description},
redness:{score,description},elasticity:{score,description}},
fitzpatrickType:1-6,summary:string}`);

  if (questionnaire) {
    return `${base}\nQ:${JSON.stringify(questionnaire)}`;
  }
  return base;
}

/**
 * Compressed real-time scan prompt
 */
export function buildCompactScanPrompt(): string {
  return compressWhitespace(`
Dermatologist AI. Quick assessment.
JSON:{skinType,skinAge,healthScore,conditions:[],concerns:[],
recommendations:{products:[],ingredients:[],lifestyle:[],warnings:[]},
detailedAnalysis:{hydration,texture,pores,pigmentation,wrinkles,acne,redness,elasticity},
fitzpatrickType,summary}`);
}
