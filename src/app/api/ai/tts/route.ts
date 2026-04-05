import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Detect language from text and return the best TTS voice.
 *
 * Voice options:
 *   tongtong  – Chinese (warm)
 *   chuichui  – Chinese (lively)
 *   xiaochen  – Chinese (professional)
 *   jam       – English gentleman
 *   kazi      – Clear & standard (good for Hindi / multi-lingual)
 *   douji     – Natural & fluent
 *   luodo     – Expressive
 */
function detectVoiceForText(text: string): string {
  // Devanagari script range (Hindi, Sanskrit, Marathi, Nepali, etc.)
  const devanagari = /[\u0900-\u097F]/;
  if (devanagari.test(text)) return 'kazi'; // clear & standard voice handles Hindi best

  // CJK Unified Ideographs (Chinese / Japanese Kanji / Korean Hanja)
  const cjk = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  if (cjk.test(text)) return 'tongtong'; // native Chinese voice

  // Arabic script (Urdu, Arabic, Persian, etc.)
  const arabic = /[\u0600-\u06FF\u0750-\u077F]/;
  if (arabic.test(text)) return 'kazi';

  // Japanese Kana (hiragana / katakana)
  const kana = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (kana.test(text)) return 'tongtong';

  // Korean Hangul
  const hangul = /[\uAC00-\uD7AF\u1100-\u11FF]/;
  if (hangul.test(text)) return 'kazi';

  // Tamil, Telugu, Bengali, and other Indic scripts
  const indic = /[\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF]/;
  if (indic.test(text)) return 'kazi';

  // Default: English / Latin-script → use English voice
  return 'jam';
}

export async function POST(req: NextRequest) {
  try {
    const { text, speed = 1.0 } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Truncate text if too long (max 1024 chars)
    const truncatedText = text.slice(0, 1024);
    const clampedSpeed = Math.min(2.0, Math.max(0.5, speed));

    // Auto-detect language and pick the right voice
    const voice = detectVoiceForText(truncatedText);
    console.log(`TTS: voice=${voice}, chars=${truncatedText.length}`);

    const zai = await ZAI.create();

    const response = await zai.audio.tts.create({
      input: truncatedText,
      voice,
      speed: clampedSpeed,
      response_format: 'wav',
      stream: false,
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    console.log(`TTS: generated ${buffer.length} bytes audio`);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: String(error) },
      { status: 500 }
    );
  }
}
