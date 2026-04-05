import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Detect language from text and return the best TTS voice.
 */
function detectVoiceForText(text: string): string {
  const devanagari = /[\u0900-\u097F]/;
  if (devanagari.test(text)) return 'kazi';

  const cjk = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  if (cjk.test(text)) return 'tongtong';

  const arabic = /[\u0600-\u06FF\u0750-\u077F]/;
  if (arabic.test(text)) return 'kazi';

  const kana = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (kana.test(text)) return 'tongtong';

  const hangul = /[\uAC00-\uD7AF\u1100-\u11FF]/;
  if (hangul.test(text)) return 'kazi';

  const indic = /[\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF]/;
  if (indic.test(text)) return 'kazi';

  return 'jam';
}

/**
 * Strip markdown formatting so TTS reads clean text.
 */
function stripMarkdown(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  cleaned = cleaned.replace(/\*{1,3}([^*]*?)\*{1,3}/g, '$1');
  cleaned = cleaned.replace(/_{1,3}([^_]*?)_{1,3}/g, '$1');
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*>\s?/gm, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { text, speed = 1.0 } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Strip markdown
    const cleanText = stripMarkdown(text);
    if (cleanText.length === 0) {
      return NextResponse.json({ error: 'No readable text after cleaning' }, { status: 400 });
    }

    const clampedSpeed = Math.min(2.0, Math.max(0.5, speed));

    // TTS API max is 1024 chars but long text causes timeouts/errors.
    // Keep within 400 chars for reliable, fast results (~4-5 seconds).
    const MAX_CHARS = 400;
    let truncated = false;
    let ttsText = cleanText;

    if (cleanText.length > MAX_CHARS) {
      // Try to cut at the last sentence-ending punctuation before the limit
      const cutStr = cleanText.slice(0, MAX_CHARS);
      const lastSentenceEnd = Math.max(
        cutStr.lastIndexOf('.'),
        cutStr.lastIndexOf('।'),
        cutStr.lastIndexOf('!'),
        cutStr.lastIndexOf('?'),
        cutStr.lastIndexOf('\n'),
      );

      ttsText = lastSentenceEnd > 100
        ? cutStr.slice(0, lastSentenceEnd + 1).trim()
        : cutStr.slice(0, MAX_CHARS).trim();

      truncated = true;
    }

    const voice = detectVoiceForText(ttsText);
    console.log(`TTS: voice=${voice}, originalChars=${cleanText.length}, ttsChars=${ttsText.length}, truncated=${truncated}`);

    const zai = await ZAI.create();

    // Single API call — fast and reliable, no gateway timeout risk
    const response = await zai.audio.tts.create({
      input: ttsText,
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
        'X-TTS-Truncated': truncated ? '1' : '0',
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
