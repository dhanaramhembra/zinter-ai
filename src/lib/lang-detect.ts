// Simple language detection based on Unicode character ranges
// No external library needed

interface LanguageResult {
  code: string;
  name: string;
}

const LANGUAGES: { code: string; name: string; ranges: [number, number][] }[] = [
  { code: 'ZH', name: 'Chinese', ranges: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF], [0x3000, 0x303F], [0xFF00, 0xFFEF]] },
  { code: 'JA', name: 'Japanese', ranges: [[0x3040, 0x309F], [0x30A0, 0x30FF]] },
  { code: 'KO', name: 'Korean', ranges: [[0xAC00, 0xD7AF], [0x1100, 0x11FF], [0x3130, 0x318F]] },
  { code: 'HI', name: 'Hindi', ranges: [[0x0900, 0x097F], [0xA8E0, 0xA8FF]] },
  { code: 'AR', name: 'Arabic', ranges: [[0x0600, 0x06FF], [0x0750, 0x077F], [0xFB50, 0xFDFF], [0xFE70, 0xFEFF]] },
  { code: 'RU', name: 'Russian', ranges: [[0x0400, 0x04FF], [0x0500, 0x052F]] },
  { code: 'ES', name: 'Spanish', ranges: [[0x00C0, 0x00FF]] }, // Uses Latin Extended
  { code: 'FR', name: 'French', ranges: [[0x00C0, 0x00FF]] },
  { code: 'DE', name: 'German', ranges: [[0x00C0, 0x00FF]] },
  { code: 'PT', name: 'Portuguese', ranges: [[0x00C0, 0x00FF]] },
];

// European languages need word-based detection since they share Latin characters
const EUROPEAN_PATTERNS: { code: string; name: string; patterns: RegExp[] }[] = [
  { code: 'ES', name: 'Spanish', patterns: [/\b(el|la|los|las|un|una|unos|unas|de|en|que|por|con|para|como|más|también|hola)\b/i] },
  { code: 'FR', name: 'French', patterns: [/\b(le|la|les|un|une|des|de|du|en|que|est|dans|pour|avec|très|aussi|bonjour)\b/i] },
  { code: 'DE', name: 'German', patterns: [/\b(der|die|das|ein|eine|ist|und|nicht|mit|auf|für|auch|bitte|hallo)\b/i] },
  { code: 'PT', name: 'Portuguese', patterns: [/\b(o|a|os|as|um|uma|de|em|que|não|por|para|com|também|olá)\b/i] },
];

export function detectLanguage(text: string): LanguageResult | null {
  if (!text || text.trim().length < 5) return null;

  const trimmed = text.trim();

  // Count CJK characters (Chinese/Japanese/Korean share CJK block)
  let cjkCount = 0;
  for (const char of trimmed) {
    const code = char.codePointAt(0) || 0;
    if (code >= 0x4E00 && code <= 0x9FFF) cjkCount++;
    if (code >= 0x3400 && code <= 0x4DBF) cjkCount++;
  }
  if (cjkCount > 0) return { code: 'ZH', name: 'Chinese' };

  // Check specific character ranges
  for (const lang of LANGUAGES) {
    // Skip Chinese (already checked above) and Latin-based languages
    if (lang.code === 'ZH') continue;
    if (['ES', 'FR', 'DE', 'PT'].includes(lang.code)) continue;

    let count = 0;
    for (const char of trimmed) {
      const code = char.codePointAt(0) || 0;
      for (const [start, end] of lang.ranges) {
        if (code >= start && code <= end) {
          count++;
          break;
        }
      }
    }
    if (count > 2) {
      return { code: lang.code, name: lang.name };
    }
  }

  // Check European languages via word patterns
  const words = trimmed.split(/\s+/);
  if (words.length >= 3) {
    for (const lang of EUROPEAN_PATTERNS) {
      let matchCount = 0;
      for (const pattern of lang.patterns) {
        if (pattern.test(trimmed)) matchCount++;
      }
      if (matchCount >= 2) {
        return { code: lang.code, name: lang.name };
      }
    }
  }

  // Default to English if text is mostly ASCII/Latin
  const latinCount = trimmed.split('').filter(c => /[a-zA-Z]/.test(c)).length;
  if (latinCount > trimmed.length * 0.5) {
    return { code: 'EN', name: 'English' };
  }

  return null;
}
