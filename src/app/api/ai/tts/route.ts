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

    // Hard limit: max 250 chars per request for reliability
    // (TTS API is flaky for Hindi text > 300 chars)
    if (cleanText.length > 250) {
      return NextResponse.json({ error: 'Text too long. Max 250 chars per request.', maxChars: 250 }, { status: 400 });
    }

    const clampedSpeed = Math.min(2.0, Math.max(0.5, speed));
    const voice = detectVoiceForText(cleanText);
    console.log(`TTS: voice=${voice}, chars=${cleanText.length}`);

    const zai = await ZAI.create();

    // Single TTS call with one retry on failure
    let audioBuffer: ArrayBuffer | null = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await zai.audio.tts.create({
          input: cleanText,
          voice,
          speed: clampedSpeed,
          response_format: 'wav',
          stream: false,
        });

        audioBuffer = await response.arrayBuffer();
        break; // Success, exit retry loop
      } catch (err) {
        lastError = err as Error;
        console.warn(`TTS attempt ${attempt} failed:`, (err as Error).message);
        if (attempt === 1) {
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!audioBuffer) {
      console.error('TTS failed after retries:', lastError);
      return NextResponse.json(
        { error: 'TTS generation failed after retry', details: lastError?.message },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(new Uint8Array(audioBuffer));
    console.log(`TTS: generated ${buffer.length} bytes audio (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

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
