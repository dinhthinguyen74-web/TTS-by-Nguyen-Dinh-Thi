import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import multer from 'multer';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import { cleanVietnameseText } from './src/utils/textNormalizer.ts';
import { countWords, countChars, formatBytes } from './src/utils/documentParser.ts';
import { combineWavBuffers, parseWavHeader } from './src/utils/wavHelper.ts';
import { convertWavToMp3 } from './src/utils/mp3Helper.ts';
import { buildVoiceDirectionPrompt } from './src/utils/voiceDirectionBuilder.ts';

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Multer in-memory storage for uploaded files (up to 30MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file định dạng .PDF hoặc .DOCX'));
    }
  },
});

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Map style to speech instruction prompts
function getStylePrompt(style: string): string {
  switch (style) {
    case 'Truyền cảm':
      return 'Emotional, warm, expressive Vietnamese reading';
    case 'Kể chuyện':
      return 'Engaging storyteller, vivid narrative tone';
    case 'Tin tức':
      return 'Clear, professional news anchor tone';
    case 'Giáo dục':
      return 'Calm, articulate, educational lecture tone';
    case 'Quảng cáo':
      return 'Energetic, upbeat, promotional voice';
    case 'Tự nhiên':
    default:
      return 'Natural, clear, fluent Vietnamese speaking';
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

/**
 * Extract text from uploaded PDF or DOCX file
 */
app.post('/api/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng chọn file PDF hoặc DOCX để tải lên' });
    }

    const { originalname, buffer, size } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    let extractedText = '';
    let pageCount = 1;
    let isScanned = false;

    if (ext === '.docx') {
      // Mammoth extracts text with paragraphs and clean structure
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
      // Also extract HTML to see if there are tables/lists to format nicely
      if (!extractedText.trim()) {
        const htmlResult = await mammoth.convertToHtml({ buffer });
        extractedText = htmlResult.value
          .replace(/<\/p>/g, '\n\n')
          .replace(/<br\s*[\/]?>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
      // Estimated page count for DOCX (~350 words per page)
      const words = countWords(extractedText);
      pageCount = Math.max(1, Math.ceil(words / 350));
    } else if (ext === '.pdf') {
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
        pageCount = pdfData.numpages || 1;
      } catch (pdfErr: any) {
        console.warn('pdf-parse failed, attempting OCR fallback...', pdfErr);
      }

      // Check if PDF has no text layer (scanned document)
      if (!extractedText || extractedText.trim().length < 50) {
        isScanned = true;
        // Check if GEMINI_API_KEY is available for OCR
        if (process.env.GEMINI_API_KEY) {
          try {
            const ocrResponse = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: buffer.toString('base64'),
                  },
                },
                {
                  text: 'Tài liệu này là bản scan tiếng Việt. Hãy trích xuất toàn bộ nội dung văn bản theo đúng thứ tự đọc, giữ tiêu đề, đoạn văn, danh sách và bảng. Không thêm lời chào hay giải thích.',
                },
              ],
            });
            extractedText = ocrResponse.text || '';
          } catch (ocrErr: any) {
            console.error('OCR extraction failed:', ocrErr);
            return res.status(422).json({
              error: 'PDF này là tài liệu scan và quá trình nhận dạng chữ OCR thất bại. Vui lòng thử lại với file rõ nét hơn.',
            });
          }
        } else {
          return res.status(422).json({
            error: 'PDF này không có lớp text (tài liệu scan/ảnh) và tính năng OCR hiện chưa khả dụng.',
          });
        }
      }
    } else {
      return res.status(400).json({ error: 'Định dạng file không được hỗ trợ' });
    }

    if (!extractedText.trim()) {
      return res.status(422).json({
        error: 'Không tìm thấy nội dung văn bản nào trong tài liệu này.',
      });
    }

    // Auto-clean light extraction glitches
    const cleanedInitial = cleanVietnameseText(extractedText, {
      cleanWhitespace: true,
      fixLineBreaks: true,
      optimizePunctuation: false, // leave punctuation intact for user review
      normalizeNumbersAndSymbols: false,
    });

    return res.json({
      success: true,
      filename: originalname,
      fileType: ext.replace('.', ''),
      fileSize: formatBytes(size),
      pageCount,
      wordCount: countWords(cleanedInitial),
      charCount: countChars(cleanedInitial),
      text: cleanedInitial,
      isScanned,
    });
  } catch (err: any) {
    console.error('Extract error:', err);
    return res.status(500).json({
      error: `Lỗi xử lý file: ${err.message || 'Không thể trích xuất nội dung'}`,
    });
  }
});

/**
 * Clean & normalize Vietnamese text with configurable options
 */
app.post('/api/clean-text', (req, res) => {
  try {
    const { text, options } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Thiếu nội dung văn bản' });
    }

    const cleaned = cleanVietnameseText(text, options || {});
    return res.json({
      success: true,
      text: cleaned,
      wordCount: countWords(cleaned),
      charCount: countChars(cleaned),
    });
  } catch (err: any) {
    console.error('Clean text error:', err);
    return res.status(500).json({ error: 'Lỗi khi chuẩn hóa văn bản' });
  }
});

/**
 * AI-assisted speech preparation (adds natural pause markers and rhythm)
 */
app.post('/api/ai-prepare', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Thiếu nội dung văn bản' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Chưa cấu hình API Key' });
    }

    const prompt = `Bạn là chuyên gia ngữ âm và chuẩn bị văn bản để đọc diễn cảm tiếng Việt (TTS).
Nhiệm vụ: Hãy chuẩn hóa văn bản sau để máy đọc giọng nói tiếng Việt mượt mà, tự nhiên nhất:
- Chuẩn hóa các số, ngày tháng, tiền tệ, tỷ lệ %, ký hiệu thành chữ viết phát âm tiếng Việt rõ ràng.
- Giữ nguyên toàn bộ nội dung, câu từ và ý nghĩa gốc của tài liệu, tuyệt đối KHÔNG tóm tắt hay cắt bớt.
- Tối ưu dấu phẩy, dấu chấm để tạo nhịp thở và ngắt nghỉ tự nhiên khi đọc.
- Chỉ trả về duy nhất văn bản kết quả đã xử lý, không có lời mở đầu hay giải thích.

Văn bản cần xử lý:
${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const preparedText = response.text?.trim() || text;

    return res.json({
      success: true,
      text: preparedText,
      wordCount: countWords(preparedText),
      charCount: countChars(preparedText),
    });
  } catch (err: any) {
    console.error('AI prepare error:', err);
    return res.status(500).json({
      error: `Lỗi tối ưu bằng AI: ${err.message || 'Không thể xử lý'}`,
    });
  }
});

/**
 * AI Auto Voice Direction: Analyze text to produce professional delivery directions
 */
function fallbackAnalyzeDirection(text: string) {
  const lower = text.toLowerCase();

  if (
    /(nghị quyết|đồng chí|lãnh đạo|chính trị|chính phủ|chiến lược|nhiệm vụ trọng tâm|báo cáo|tổng kết|nâng cao|bảo đảm|phát huy|đẩy mạnh)/i.test(
      lower
    )
  ) {
    return {
      contentType: 'political',
      recommendedPersonaId: 'quoc_dung',
      recommendedGender: 'male',
      recommendedAge: 'middle_aged',
      recommendedRegion: 'north',
      recommendedSpeed: 1.0,
      recommendedEnergy: 'medium',
      recommendedEmotion: 'serious',
      recommendedPause: 'medium',
      recommendedEmphasis: 'high',
      keyPhrasesToEmphasize: [
        'nhiệm vụ trọng tâm',
        'mục tiêu chiến lược',
        'tiếp tục nâng cao',
        'bảo đảm hoàn thành',
      ],
      directionSummary:
        'Đọc bằng giọng chính luận trang trọng, đĩnh đạc và chuẩn mực. Ngắt nghỉ dứt khoát sau các mệnh đề dài, nhấn mạnh vào các từ khóa chiến lược và số liệu thành tựu.',
      rawDirectionPrompt:
        'Authoritative, formal, official Vietnamese leadership delivery. Calm, steady, and resolute tone with high gravity. Careful natural pacing on multi-clause sentences. Emphasize strategic goals and achievement statistics.',
    };
  }

  if (
    /(thời sự|bản tin|tin tức|hôm nay|ghi nhận|dự báo|kinh tế|chứng khoán|thị trường)/i.test(
      lower
    )
  ) {
    return {
      contentType: 'news',
      recommendedPersonaId: 'mai_phuong',
      recommendedGender: 'female',
      recommendedAge: 'middle_aged',
      recommendedRegion: 'north',
      recommendedSpeed: 1.05,
      recommendedEnergy: 'medium',
      recommendedEmotion: 'neutral',
      recommendedPause: 'medium',
      recommendedEmphasis: 'medium',
      keyPhrasesToEmphasize: ['tin tức hôm nay', 'thị trường ghi nhận', 'chỉ số tăng trưởng'],
      directionSummary:
        'Đọc bằng giọng BTV thời sự rõ ràng, khách quan, tròn vành rõ chữ. Nhịp đọc nhanh vừa và đều đặn, không giật gân.',
      rawDirectionPrompt:
        'Objective, credible, professional Vietnamese news anchor delivery. Crisp articulation, steady moderately brisk cadence, neutral and authoritative tone.',
    };
  }

  if (
    /(phim tài liệu|phóng sự|lịch sử|thời gian|chiến trường|sông|núi|ký ức|hào hùng)/i.test(
      lower
    )
  ) {
    return {
      contentType: 'documentary',
      recommendedPersonaId: 'manh_dung',
      recommendedGender: 'male',
      recommendedAge: 'middle_aged',
      recommendedRegion: 'north',
      recommendedSpeed: 0.9,
      recommendedEnergy: 'medium',
      recommendedEmotion: 'warm',
      recommendedPause: 'long',
      recommendedEmphasis: 'high',
      keyPhrasesToEmphasize: ['dấu ấn thời gian', 'chứng tích lịch sử'],
      directionSummary:
        'Đọc bằng giọng nam trầm ấm, sâu lắng, giàu tính tự sự. Tạo khoảng lặng có chủ đích giữa các cảnh để tăng chiều sâu chiêm nghiệm.',
      rawDirectionPrompt:
        'Deep, warm, reflective documentary narration. Slower pacing, deliberate cinematic pauses, thoughtful resonance.',
    };
  }

  if (
    /(mua ngay|đăng ký ngay|ưu đãi|giảm giá|khuyến mãi|sản phẩm|tính năng|thương hiệu)/i.test(
      lower
    )
  ) {
    return {
      contentType: 'commercial',
      recommendedPersonaId: 'minh_hoang',
      recommendedGender: 'male',
      recommendedAge: 'young_adult',
      recommendedRegion: 'north',
      recommendedSpeed: 1.15,
      recommendedEnergy: 'high',
      recommendedEmotion: 'expressive',
      recommendedPause: 'short',
      recommendedEmphasis: 'high',
      keyPhrasesToEmphasize: ['ưu đãi đặc biệt', 'mua ngay', 'khám phá ngay'],
      directionSummary:
        'Đọc bằng giọng quảng cáo sôi nổi, trẻ trung, năng lượng cao. Nhấn mạnh tên thương hiệu, điểm nổi bật và lời kêu gọi hành động.',
      rawDirectionPrompt:
        'Energetic, bright, engaging promotional TVC voice. Dynamic vocal presence, upbeat enthusiasm. Highlight brand identity and Call-To-Action.',
    };
  }

  if (/(tiktok|reels|shorts|video|mẹo|bí quyết|cực đỉnh|xem ngay|đố bạn)/i.test(lower)) {
    return {
      contentType: 'tiktok',
      recommendedPersonaId: 'minh_hoang',
      recommendedGender: 'male',
      recommendedAge: 'young_adult',
      recommendedRegion: 'north',
      recommendedSpeed: 1.25,
      recommendedEnergy: 'high',
      recommendedEmotion: 'expressive',
      recommendedPause: 'short',
      recommendedEmphasis: 'high',
      keyPhrasesToEmphasize: ['bí quyết cực đỉnh', 'xem ngay', 'đừng bỏ lỡ'],
      directionSummary:
        'Đọc với phong cách video ngắn tự nhiên, gần gũi như trò chuyện, bắt tai ngay từ câu mở đầu và nhịp điệu dồn dập.',
      rawDirectionPrompt:
        'Lively, high-energy conversational short-video creator delivery. Fast-paced, punchy opening hook, engaging and friendly cadence.',
    };
  }

  if (
    /(bé|các bạn nhỏ|thiếu nhi|cổ tích|mầm non|hoạt hình|chú thỏ|rùa con|công chúa|hoàng tử|ông bụt|bà tiên|cháu ngoan|đồng dao|tập đọc|khủng long|đố các bạn|chúng mình)/i.test(
      lower
    )
  ) {
    return {
      contentType: 'kids',
      recommendedPersonaId: 'be_bong',
      recommendedGender: 'female',
      recommendedAge: 'child',
      recommendedRegion: 'north',
      recommendedSpeed: 1.0,
      recommendedEnergy: 'high',
      recommendedEmotion: 'expressive',
      recommendedPause: 'medium',
      recommendedEmphasis: 'high',
      keyPhrasesToEmphasize: ['ngày xửa ngày xưa', 'các bạn nhỏ', 'thỏ và rùa', 'bé ngoan'],
      directionSummary:
        'Đọc bằng giọng thiếu nhi trong trẻo, líu lo đáng yêu và tràn ngập hồn nhiên. Biểu cảm hào hứng, sinh động như đang kể chuyện cổ tích cho các bạn nhỏ.',
      rawDirectionPrompt:
        'Authentic sweet, high-pitched young Vietnamese 7-year-old child voice (bé thiếu nhi). Cute, innocent, playful, cheerful and enthusiastic cadence, expressive and engaging for children stories and cartoons.',
    };
  }

  // Default to audiobook / storytelling
  return {
    contentType: 'audiobook',
    recommendedPersonaId: 'lan_anh',
    recommendedGender: 'female',
    recommendedAge: 'young_adult',
    recommendedRegion: 'north',
    recommendedSpeed: 0.95,
    recommendedEnergy: 'medium',
    recommendedEmotion: 'warm',
    recommendedPause: 'medium',
    recommendedEmphasis: 'medium',
    keyPhrasesToEmphasize: ['câu chuyện', 'khoảnh khắc'],
    directionSummary:
      'Đọc bằng giọng truyền cảm, uyển chuyển theo mạch cảm xúc, ngắt nghỉ tự nhiên giúp người nghe dễ dàng hòa mình vào nội dung.',
    rawDirectionPrompt:
      'Warm, expressive, natural Vietnamese storytelling. Flexible rhythm adapting to plot mood, breathing pauses between scene transitions.',
  };
}

/**
 * AI Auto Voice Direction: Analyze text to produce professional delivery directions
 */
app.post('/api/ai-analyze-direction', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Thiếu nội dung văn bản' });
    }

    // Try Gemini AI first
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `Bạn là đạo diễn âm thanh và chuyên gia lồng tiếng phát thanh chuyên nghiệp tiếng Việt.
Hãy phân tích văn bản sau đây và trả về hướng dẫn đạo diễn giọng đọc (Voice Direction) dưới dạng JSON chuẩn.

QUY TẮC PHÂN TÍCH:
1. Xác định "contentType":
   - "kids" (nếu là truyện thiếu nhi, cổ tích, hoạt hình, bài học mầm non, đồng dao, chuyện cho bé)
   - "political" (nếu là văn bản chính trị, nghị quyết, báo cáo lãnh đạo, tổng kết cơ quan)
   - "news" (nếu là bản tin thời sự, sự kiện, kinh tế, thể thao)
   - "documentary" (nếu là phóng sự, phim tài liệu, lịch sử, chiêm nghiệm)
   - "commercial" (nếu là quảng cáo, TVC, giới thiệu sản phẩm, chào hàng)
   - "audiobook" (nếu là truyện, sách, tiểu thuyết, tản văn người lớn)
   - "tiktok" (nếu là video ngắn, chia sẻ mẹo, conversational, bắt trend)
2. Gợi ý "recommendedPersonaId":
   - "be_bong" (Bé Bống - Bé gái 7 tuổi líu lo cổ tích mầm non)
   - "be_bo" (Bé Bo - Bé trai 8 tuổi hoạt hình tinh nghịch)
   - "be_mai_anh" (Bé Mai Anh - Bé gái Nam Bộ 6 tuổi ngọt ngào)
   - "be_bin" (Bé Bin - Bé trai Nam Bộ lanh lợi)
   - "be_tho_con" (Bé Thỏ Con - Mầm non 4 tuổi tập nói)
   - "minh_anh" (Minh Anh - Học sinh tiểu học tập đọc)
   - "chi_tho_ngoc" (Chị Thỏ Ngọc - Cô tiên kể chuyện ru ngủ bé)
   - "mai_phuong" (BTV Thời sự & Chính luận Nữ)
   - "quoc_dung" (Chính luận & Báo cáo lãnh đạo Nam)
   - "manh_dung" (Phóng sự & Tài liệu Nam trầm ấm)
   - "lan_anh" (Thuyết minh, Tin tức & Sách nói Nữ)
   - "thao_vy" (TVC, Podcast & Đời sống Miền Nam Nữ)
   - "minh_hoang" (TikTok & TVC Năng động Nam)
   - "bac_huu_nam" (Truyện đêm, Hồi ký Miền Nam Nam cao tuổi)
3. Xác định các tham số đọc:
   - "recommendedGender": "male" hoặc "female"
   - "recommendedAge": "child", "elderly", "middle_aged", hoặc "young_adult"
   - "recommendedRegion": "north", "south", hoặc "central"
   - "recommendedSpeed": số từ 0.8 đến 1.3
   - "recommendedEnergy": "low", "medium", hoặc "high"
   - "recommendedEmotion": "serious", "warm", "expressive", hoặc "neutral"
   - "recommendedPause": "short", "medium", hoặc "long"
   - "recommendedEmphasis": "low", "medium", hoặc "high"
   - "keyPhrasesToEmphasize": danh sách tối đa 5 cụm từ then chốt cần nhấn mạnh
   - "directionSummary": bản tóm tắt đạo diễn bằng tiếng Việt (khoảng 2-3 câu ngắn)
   - "rawDirectionPrompt": bản hướng dẫn chi tiết bằng tiếng Anh chuyên ngành TTS (dành cho speechMetadata.style)

LƯU Ý CỰC KỲ QUAN TRỌNG:
Chỉ phân tích CÁCH ĐỌC và NGỮ ĐIỆU. Tuyệt đối KHÔNG thay đổi, diễn giải, hay tóm tắt nội dung văn bản.

Văn bản cần phân tích:
${text.slice(0, 3000)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const jsonStr = response.text?.trim() || '{}';
        const analysis = JSON.parse(jsonStr);

        if (analysis && analysis.contentType) {
          return res.json({
            success: true,
            analysis,
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini AI analyze direction error, using intelligent fallback:', geminiErr);
      }
    }

    // High quality rule-based fallback
    const fallback = fallbackAnalyzeDirection(text);
    return res.json({
      success: true,
      analysis: fallback,
    });
  } catch (err: any) {
    console.error('AI analyze direction error:', err);
    const fallback = fallbackAnalyzeDirection(req.body?.text || '');
    return res.json({
      success: true,
      analysis: fallback,
    });
  }
});

// In-memory audio cache to prevent redundant Gemini API calls and save quota
interface CachedAudioEntry {
  audioBase64: string;
  mp3Base64?: string;
  duration: number;
  voice: string;
  timestamp: number;
}
const audioCache = new Map<string, CachedAudioEntry>();

function getAudioCacheKey(text: string, voice: string, direction?: string, speed = 1.0): string {
  const normText = text.trim().slice(0, 400);
  return `${voice}_${speed}_${direction || ''}_${normText}`;
}

/**
 * TTS generation for a text chunk using Gemini 3.8 Flash TTS with dual-model fallback
 * Supports custom Voice Direction, speed, and returns both WAV & MP3 formats
 */
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voice = 'Kore',
      speed = 1.0,
      style = 'Tự nhiên',
      voiceDirection,
      generateMp3 = true,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Nội dung đọc không được để trống' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Chưa cấu hình Gemini API Key' });
    }

    // Supported prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const validVoices = ['Kore', 'Zephyr', 'Puck', 'Fenrir', 'Charon'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    // Build style direction: prefer direct voiceDirection if provided, else fallback to standard
    let finalStyleDirection = voiceDirection;
    if (!finalStyleDirection || typeof finalStyleDirection !== 'string') {
      const styleInstruction = getStylePrompt(style);
      const speedInstruction =
        speed > 1.15
          ? ', fast pace'
          : speed < 0.85
          ? ', slow deliberate pace'
          : '';
      finalStyleDirection = `${styleInstruction}${speedInstruction}`;
    }

    // Check in-memory cache first to save quota
    const cacheKey = getAudioCacheKey(text, chosenVoice, finalStyleDirection, speed);
    const cachedItem = audioCache.get(cacheKey);
    if (cachedItem) {
      return res.json({
        success: true,
        audioBase64: cachedItem.audioBase64,
        mp3Base64: cachedItem.mp3Base64,
        duration: cachedItem.duration,
        voice: cachedItem.voice,
        style,
        speed,
        cached: true,
      });
    }

    // Multi-tier TTS model strategy:
    // 1. Try gemini-3.8-flash-tts first (high quality, full expression, separate quota pool)
    // 2. Fallback to gemini-3.8-flash-lite-tts
    const modelsToTry = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let base64Audio: string | null = null;
    let successfulModel = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: text.trim(),
                  speechMetadata: {
                    style: finalStyleDirection,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        const audioData =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          base64Audio = audioData;
          successfulModel = model;
          break;
        }
      } catch (modelErr: any) {
        console.warn(`TTS model ${model} error:`, modelErr?.message || modelErr);
        lastError = modelErr;
      }
    }

    if (!base64Audio) {
      const isQuota =
        lastError?.message?.includes('429') ||
        lastError?.message?.includes('quota') ||
        lastError?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuota) {
        return res.json({
          success: true,
          isQuotaExceeded: true,
          useClientFallback: true,
          text: text.trim(),
          voice: chosenVoice,
          speed,
          warning:
            'Đã đạt giới hạn quota hàng ngày của Gemini Cloud TTS miễn phí. Hệ thống sẽ phát trực tiếp qua giọng đọc dự phòng.',
        });
      }

      return res.status(502).json({
        error:
          lastError?.message ||
          'Mô hình không trả về dữ liệu âm thanh. Vui lòng thử lại với đoạn văn ngắn hơn.',
      });
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    const headerInfo = parseWavHeader(wavBuffer);
    let duration = 0;
    if (headerInfo && headerInfo.sampleRate > 0) {
      const bytesPerSec =
        (headerInfo.sampleRate * headerInfo.numChannels * headerInfo.bitsPerSample) / 8;
      duration = headerInfo.dataLength / bytesPerSec;
    } else {
      duration = Math.max(0, wavBuffer.length - 44) / 48000;
    }

    // Generate MP3 encoding
    let mp3Base64: string | undefined;
    if (generateMp3) {
      try {
        const mp3Buffer = convertWavToMp3(wavBuffer, 128);
        mp3Base64 = `data:audio/mp3;base64,${mp3Buffer.toString('base64')}`;
      } catch (mp3Err) {
        console.warn('MP3 conversion warning:', mp3Err);
      }
    }

    // Store in memory cache
    const finalAudioBase64 = `data:audio/wav;base64,${base64Audio}`;
    const roundedDuration = Math.round(duration * 10) / 10;
    audioCache.set(cacheKey, {
      audioBase64: finalAudioBase64,
      mp3Base64,
      duration: roundedDuration,
      voice: chosenVoice,
      timestamp: Date.now(),
    });
    if (audioCache.size > 150) {
      const first = audioCache.keys().next().value;
      if (first) audioCache.delete(first);
    }

    return res.json({
      success: true,
      audioBase64: finalAudioBase64,
      mp3Base64,
      duration: roundedDuration,
      voice: chosenVoice,
      modelUsed: successfulModel,
      style,
      speed,
    });
  } catch (err: any) {
    console.error('TTS generation error:', err);
    let errorMsg = 'Không thể tạo âm thanh.';
    if (err.message) {
      if (err.message.includes('quota') || err.message.includes('ResourceExhausted')) {
        errorMsg = 'Hệ thống đã đạt giới hạn quota tạm thời. Vui lòng chờ vài giây rồi thử lại.';
      } else {
        errorMsg = err.message;
      }
    }
    return res.status(500).json({ error: errorMsg });
  }
});

/**
 * Convert standalone WAV to MP3
 */
app.post('/api/convert-mp3', (req, res) => {
  try {
    const { wavBase64 } = req.body;
    if (!wavBase64 || typeof wavBase64 !== 'string') {
      return res.status(400).json({ error: 'Thiếu dữ liệu WAV' });
    }

    const cleanBase64 = wavBase64.replace(/^data:audio\/\w+;base64,/, '');
    const wavBuffer = Buffer.from(cleanBase64, 'base64');
    const mp3Buffer = convertWavToMp3(wavBuffer, 128);

    return res.json({
      success: true,
      mp3Base64: `data:audio/mp3;base64,${mp3Buffer.toString('base64')}`,
    });
  } catch (err: any) {
    console.error('MP3 convert error:', err);
    return res.status(500).json({ error: 'Lỗi chuyển đổi sang MP3' });
  }
});

/**
 * Merge multiple audio chunks into one complete audio file (WAV and MP3)
 */
app.post('/api/merge-audio', (req, res) => {
  try {
    const { audioChunks, silenceMs = 250 } = req.body;
    if (!audioChunks || !Array.isArray(audioChunks) || audioChunks.length === 0) {
      return res.status(400).json({ error: 'Danh sách đoạn âm thanh không hợp lệ' });
    }

    const buffers: Buffer[] = audioChunks
      .map((item: string) => {
        const cleanBase64 = item.replace(/^data:audio\/\w+;base64,/, '');
        return Buffer.from(cleanBase64, 'base64');
      })
      .filter((buf) => buf.length > 44);

    if (buffers.length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu âm thanh hợp lệ để ghép' });
    }

    const mergedWavBuffer = combineWavBuffers(buffers, Number(silenceMs) || 250);
    const headerInfo = parseWavHeader(mergedWavBuffer);
    const duration = headerInfo ? headerInfo.dataLength / 48000 : 0;

    let mp3Base64: string | undefined;
    try {
      const mergedMp3Buffer = convertWavToMp3(mergedWavBuffer, 128);
      mp3Base64 = `data:audio/mp3;base64,${mergedMp3Buffer.toString('base64')}`;
    } catch (mp3Err) {
      console.warn('Merged MP3 conversion warning:', mp3Err);
    }

    return res.json({
      success: true,
      audioBase64: `data:audio/wav;base64,${mergedWavBuffer.toString('base64')}`,
      mp3Base64,
      duration: Math.round(duration * 10) / 10,
      totalSize: formatBytes(mergedWavBuffer.length),
    });
  } catch (err: any) {
    console.error('Merge audio error:', err);
    return res.status(500).json({ error: 'Lỗi khi ghép file âm thanh' });
  }
});

/**
 * Get available Vietnamese voices & styles info
 */
app.get('/api/voices', (_req, res) => {
  res.json({
    voices: [
      {
        id: 'Kore',
        name: 'Kore (Nữ)',
        gender: 'female',
        description: 'Giọng nữ ấm áp, truyền cảm, tự nhiên, thích hợp đọc sách và tâm sự',
        recommendedStyle: 'Truyền cảm',
      },
      {
        id: 'Zephyr',
        name: 'Zephyr (Nữ)',
        gender: 'female',
        description: 'Giọng nữ trong trẻo, hoạt bát, chuẩn mực, thích hợp đọc tin tức và bài giảng',
        recommendedStyle: 'Tin tức',
      },
      {
        id: 'Fenrir',
        name: 'Fenrir (Nam)',
        gender: 'male',
        description: 'Giọng nam trầm ấm, điềm đạm, cuốn hút, rất hợp tiểu thuyết và phóng sự',
        recommendedStyle: 'Kể chuyện',
      },
      {
        id: 'Puck',
        name: 'Puck (Nam)',
        gender: 'male',
        description: 'Giọng nam trẻ trung, năng động, tươi sáng, thích hợp video và quảng cáo',
        recommendedStyle: 'Quảng cáo',
      },
      {
        id: 'Charon',
        name: 'Charon (Nam)',
        gender: 'male',
        description: 'Giọng nam chững chạc, uy quyền, đĩnh đạc, thích hợp tài liệu và thông cáo',
        recommendedStyle: 'Tự nhiên',
      },
    ],
    styles: [
      'Tự nhiên',
      'Truyền cảm',
      'Kể chuyện',
      'Tin tức',
      'Giáo dục',
      'Quảng cáo',
    ],
    speeds: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0],
  });
});

// -------------------------------------------------------------
// Vite middleware (dev) / Static files (production)
// -------------------------------------------------------------
async function setupViteOrStatic() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

setupViteOrStatic().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Việt Voice AI server running on http://0.0.0.0:${PORT}`);
  });
});
