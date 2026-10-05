import { TextChunk } from '../types/index.ts';

/**
 * Counts words accurately for Vietnamese and international text.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Counts characters excluding trailing/leading whitespace.
 */
export function countChars(text: string): number {
  return text ? text.length : 0;
}

/**
 * Formats byte size to human readable (KB, MB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Detects chapters or major headings in text.
 */
export function detectChapters(text: string): { title: string; startIndex: number }[] {
  const chapterRegex =
    /(?:^|\n)(?:(Chương\s+[0-9IVXLCDM]+(?::|\s+[^\n]+)?|Phần\s+[0-9IVXLCDM]+(?::|\s+[^\n]+)?|Bài\s+[0-9IVXLCDM]+(?::|\s+[^\n]+)?|Chapter\s+[0-9IVXLCDM]+(?::|\s+[^\n]+)?|#{1,3}\s+[^\n]+|[A-ZÀ-Ỹ0-9\s]{4,60}(?:\n|\r\n|$)))/gi;

  const chapters: { title: string; startIndex: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = chapterRegex.exec(text)) !== null) {
    const rawTitle = match[1] || match[0];
    const cleaned = rawTitle.replace(/^#+\s*/, '').trim();
    if (cleaned.length >= 3 && cleaned.length <= 80) {
      chapters.push({
        title: cleaned,
        startIndex: match.index,
      });
    }
  }

  return chapters;
}

/**
 * Splits text into safe, optimal chunks for TTS.
 * Prioritizes: Chapters -> Paragraphs -> Sentences -> Words.
 * Default max chunk length: ~1500 chars (approx. 250-300 Vietnamese words)
 */
export function splitTextIntoChunks(
  text: string,
  maxChars = 1400,
  baseTitle = 'Đoạn'
): TextChunk[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.length <= maxChars) {
    return [
      {
        id: `chunk-0-${Date.now()}`,
        index: 1,
        title: `${baseTitle} 1`,
        text: trimmed,
        wordCount: countWords(trimmed),
        charCount: trimmed.length,
        status: 'pending',
      },
    ];
  }

  const chunks: string[] = [];
  // Split into paragraphs first
  const paragraphs = trimmed.split(/\n\s*\n/);
  let currentChunk = '';

  for (const para of paragraphs) {
    const cleanPara = para.trim();
    if (!cleanPara) continue;

    if ((currentChunk + '\n\n' + cleanPara).length <= maxChars) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
    } else {
      // If currentChunk has content, push it
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // If single paragraph exceeds maxChars, split by sentences
      if (cleanPara.length > maxChars) {
        const sentences = cleanPara.match(/[^.!?]+[.!?]+|\S+$/g) || [cleanPara];
        for (const sent of sentences) {
          const cleanSent = sent.trim();
          if (!cleanSent) continue;

          if ((currentChunk + ' ' + cleanSent).length <= maxChars) {
            currentChunk = currentChunk ? `${currentChunk} ${cleanSent}` : cleanSent;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = '';
            }

            // If a single sentence exceeds maxChars, split by words
            if (cleanSent.length > maxChars) {
              const words = cleanSent.split(/\s+/);
              for (const word of words) {
                if ((currentChunk + ' ' + word).length <= maxChars) {
                  currentChunk = currentChunk ? `${currentChunk} ${word}` : word;
                } else {
                  if (currentChunk) chunks.push(currentChunk);
                  currentChunk = word;
                }
              }
            } else {
              currentChunk = cleanSent;
            }
          }
        }
      } else {
        currentChunk = cleanPara;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.map((chunkText, idx) => {
    // Attempt to extract title from first line of chunk
    const firstLine = chunkText.split('\n')[0].trim();
    let title = `${baseTitle} ${idx + 1}`;
    if (firstLine.length < 40 && /(chương|phần|bài|chapter|tiêu đề)/i.test(firstLine)) {
      title = firstLine;
    }

    return {
      id: `chunk-${idx}-${Date.now()}`,
      index: idx + 1,
      title,
      text: chunkText,
      wordCount: countWords(chunkText),
      charCount: chunkText.length,
      status: 'pending',
    };
  });
}
