/**
 * Vietnamese Text Normalizer for Natural Text-to-Speech
 * Handles whitespace, line-wrap repair, punctuation optimization,
 * and number/currency/symbol expansion for Vietnamese audio.
 */

// Basic single-digit Vietnamese words
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/**
 * Converts a 3-digit number (0-999) to Vietnamese words.
 */
function readThreeDigits(n: number, fullThree: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];

  if (h > 0 || fullThree) {
    parts.push(`${DIGITS[h]} trăm`);
  }

  if (t > 1) {
    parts.push(`${DIGITS[t]} mươi`);
    if (u === 1) parts.push('mốt');
    else if (u === 4 && t > 1) parts.push('bốn');
    else if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 1) {
    parts.push('mười');
    if (u === 1) parts.push('một');
    else if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]);
  } else {
    // t === 0
    if (u > 0) {
      if (h > 0 || fullThree) parts.push('lẻ');
      parts.push(DIGITS[u]);
    }
  }

  return parts.join(' ');
}

/**
 * Converts any non-negative integer up to 999,999,999,999 to Vietnamese words.
 */
export function numberToVietnameseWords(numStr: string | number): string {
  const cleaned = String(numStr).replace(/[.,\s]/g, '');
  if (!/^\d+$/.test(cleaned)) return String(numStr);
  const n = parseInt(cleaned, 10);
  if (n === 0) return 'không';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  let temp = n;
  const groups: number[] = [];

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const resultWords: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val > 0) {
      const isFirst = i === groups.length - 1;
      const readVal = readThreeDigits(val, !isFirst);
      resultWords.push(`${readVal} ${units[i]}`.trim());
    }
  }

  return resultWords.join(' ').trim();
}

/**
 * Normalizes Vietnamese currencies: e.g. "150.000 đ", "2.000.000 VNĐ", "$50", "50€"
 */
export function normalizeCurrency(text: string): string {
  let res = text;

  // VNĐ / đ / dong / đồng
  res = res.replace(
    /(\d{1,3}(?:[.,]\d{3})*|\d+)\s*(?:vnđ|vnd|đ|đồng|dong)(?=[^\p{L}\d]|$)/giu,
    (_match, num) => {
      const words = numberToVietnameseWords(num);
      return `${words} đồng`;
    }
  );

  // USD: $100 or 100 USD
  res = res.replace(/\$\s*(\d{1,3}(?:[.,]\d{3})*|\d+)/g, (_match, num) => {
    const words = numberToVietnameseWords(num);
    return `${words} đô la`;
  });
  res = res.replace(/(\d{1,3}(?:[.,]\d{3})*|\d+)\s*usd(?=[^\p{L}\d]|$)/giu, (_match, num) => {
    const words = numberToVietnameseWords(num);
    return `${words} đô la`;
  });

  return res;
}

/**
 * Normalizes percentages: e.g. "99%", "50.5%"
 */
export function normalizePercentages(text: string): string {
  return text.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_match, num) => {
    const cleanNum = num.replace(',', '.');
    return `${cleanNum} phần trăm`;
  });
}

/**
 * Normalizes common Vietnamese dates: "DD/MM/YYYY" or "DD-MM-YYYY"
 */
export function normalizeDates(text: string): string {
  return text.replace(
    /\b(0?[1-9]|[12]\d|3[01])[\/\-.](0?[1-9]|1[0-2])[\/\-.](\d{4})\b/g,
    (_match, day, month, year) => {
      return `ngày ${parseInt(day, 10)} tháng ${parseInt(month, 10)} năm ${year}`;
    }
  );
}

/**
 * Normalizes common scientific units, measurements, and symbols
 */
export function normalizeUnitsAndSymbols(text: string): string {
  let res = text;
  // Units with preceding number
  res = res.replace(/(\d+)\s*(km\/h)\b/gi, '$1 ki-lô-mét trên giờ');
  res = res.replace(/(\d+)\s*(m\/s)\b/gi, '$1 mét trên giây');
  res = res.replace(/(\d+)\s*(km|cây số)\b/gi, '$1 ki-lô-mét');
  res = res.replace(/(\d+)\s*(m²|m2)\b/gi, '$1 mét vuông');
  res = res.replace(/(\d+)\s*(m³|m3)\b/gi, '$1 mét khối');
  res = res.replace(/(\d+)\s*(kg|kí)\b/gi, '$1 ki-lô-gam');
  res = res.replace(/(\d+)\s*(g|gam)\b/gi, '$1 gam');
  res = res.replace(/(\d+)\s*(cm)\b/gi, '$1 xăng-ti-mét');
  res = res.replace(/(\d+)\s*(mm)\b/gi, '$1 mi-li-mét');
  res = res.replace(/(\d+)\s*(ha)\b/gi, '$1 héc-ta');
  res = res.replace(/(\d+)\s*°C\b/gi, '$1 độ C');
  res = res.replace(/(\d+)\s*°F\b/gi, '$1 độ F');

  // Symbols
  res = res.replace(/&/g, ' và ');
  res = res.replace(/@/g, ' a-còng ');
  res = res.replace(/\+/g, ' cộng ');
  res = res.replace(/=/g, ' bằng ');

  return res;
}

/**
 * Fixes broken line wraps from PDF extraction.
 * Recombines words split by hyphens (e.g. "phát-\ntriển" -> "phát triển")
 * and recombines lines broken mid-sentence.
 */
export function fixPdfLineBreaks(text: string): string {
  let res = text;

  // Remove hyphen at line breaks
  res = res.replace(/(\p{L}+)-\s*\n\s*(\p{L}+)/gu, '$1$2');

  // Fix mid-sentence breaks: line ending with a letter or comma, followed by line starting with lowercase
  res = res.replace(/([^\n.!?:]+)\n(?=[\p{Ll}])/gu, '$1 ');

  return res;
}

/**
 * Optimizes punctuation spacing and flow for clean speech synthesis pauses.
 */
export function optimizePunctuation(text: string): string {
  let res = text;

  // Replace multiple punctuation marks with a single standard one
  res = res.replace(/\.{4,}/g, '...');
  res = res.replace(/!{2,}/g, '!');
  res = res.replace(/\?{2,}/g, '?');

  // Ensure single space after punctuation (.,;:!?) if followed by a letter/digit
  res = res.replace(/([.,;:!?])(?=[^\s\d.,;:!?])/g, '$1 ');

  // Remove space BEFORE punctuation
  res = res.replace(/\s+([.,;:!?])/g, '$1');

  // Standardize quotes and brackets
  res = res.replace(/[“”«»]/g, '"');
  res = res.replace(/[‘’]/g, "'");

  // Ensure ellipsis has breathing space
  res = res.replace(/\.{3}\s*/g, '... ');

  return res;
}

/**
 * Cleans excessive whitespace and blank lines while preserving paragraph structure.
 */
export function cleanWhitespace(text: string): string {
  return text
    // Replace tabs, non-breaking spaces with standard space
    .replace(/[\t\u00A0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    // Replace multiple horizontal spaces with single space
    .replace(/ {2,}/g, ' ')
    // Remove space at end of lines
    .replace(/[ \t]+\n/g, '\n')
    // Remove multiple consecutive blank lines (limit to max 2 newlines = 1 blank line)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Master cleanup pipeline with configurable options.
 */
export function cleanVietnameseText(
  rawText: string,
  options: {
    cleanWhitespace?: boolean;
    fixLineBreaks?: boolean;
    optimizePunctuation?: boolean;
    normalizeNumbersAndSymbols?: boolean;
  } = {}
): string {
  const {
    cleanWhitespace: doCleanWs = true,
    fixLineBreaks: doFixLines = true,
    optimizePunctuation: doPunct = true,
    normalizeNumbersAndSymbols: doNumbers = true,
  } = options;

  let text = rawText;

  if (doFixLines) {
    text = fixPdfLineBreaks(text);
  }

  if (doNumbers) {
    text = normalizeCurrency(text);
    text = normalizePercentages(text);
    text = normalizeDates(text);
    text = normalizeUnitsAndSymbols(text);
  }

  if (doPunct) {
    text = optimizePunctuation(text);
  }

  if (doCleanWs) {
    text = cleanWhitespace(text);
  }

  return text;
}
