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
export function buildCompactAnalysisPrompt(
  questionnaire?: Record<string, any>,
): string {
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
 * Ultra-compressed real-time scan prompt for rate-limited scenarios
 * Reduces ~80% tokens for fastest processing
 */
export function buildUltraCompactScanPrompt(): string {
  return compressWhitespace(`
Derm AI. Quick skin scan. JSON only:
{skinType:"dry/oily/combo/normal/sens",skinAge:25,healthScore:70,
conditions:[],concerns:[],
detailedAnalysis:{hydration:{score:70,description:"ok"},
texture:{score:70,description:"ok"},pores:{score:70,description:"ok"},
pigmentation:{score:70,description:"ok"},wrinkles:{score:70,description:"ok"},
acne:{score:70,description:"ok"},redness:{score:70,description:"ok"},
elasticity:{score:70,description:"ok"}},
fitzpatrickType:3,summary:"brief"}`);
}

/**
 * Minimal analysis prompt for emergency fallback
 */
export function buildMinimalScanPrompt(): string {
  return compressWhitespace(`
JSON:{skinType,skinAge,healthScore,
detailedAnalysis:{hydration:{score,description},texture:{score,description},
pores:{score,description},pigmentation:{score,description},wrinkles:{score,description},
acne:{score,description},redness:{score,description},elasticity:{score,description}},
summary}`);
}
