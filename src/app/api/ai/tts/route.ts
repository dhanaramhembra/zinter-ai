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
  if (devanagari.test(text)) return 'kazi';

  // CJK Unified Ideographs (Chinese / Japanese Kanji / Korean Hanja)
  const cjk = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  if (cjk.test(text)) return 'tongtong';

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

/**
 * Strip markdown formatting so TTS reads clean text.
 * Removes: #, *, **, __, -, `code`, [links](url), images, etc.
 */
function stripMarkdown(text: string): string {
  let cleaned = text;
  // Remove images ![alt](url)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Remove links [text](url) → keep text
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*{1,3}([^*]*?)\*{1,3}/g, '$1');
  cleaned = cleaned.replace(/_{1,3}([^_]*?)_{1,3}/g, '$1');
  // Remove headings markers (# ## ### etc)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Remove code blocks and inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');
  // Remove blockquotes
  cleaned = cleaned.replace(/^\s*>\s?/gm, '');
  // Remove extra blank lines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Split text into sentences for chunked TTS.
 * TTS max is 1024 chars, but shorter chunks = faster + smaller audio.
 * We target ~400 chars per chunk for reliability.
 */
function splitIntoChunks(text: string, maxLen = 400): string[] {
  // Try splitting on sentence-ending punctuation
  const sentences = text.match(/[^.!?।\n]+[.!?।]*/g) || [text];

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + ' ' + trimmed).trim().length <= maxLen) {
      current = (current + ' ' + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      // If single sentence exceeds maxLen, force-split by commas
      if (trimmed.length > maxLen) {
        const parts = trimmed.split(/[,،;:]/);
        let sub = '';
        for (const part of parts) {
          if ((sub + part).trim().length <= maxLen) {
            sub = (sub + part + ',').trim();
          } else {
            if (sub) chunks.push(sub.replace(/[,]$/, ''));
            sub = part.trim();
          }
        }
        if (sub) chunks.push(sub.replace(/[,]$/, ''));
        current = '';
      } else {
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
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

    // Strip markdown, clean up the text
    const cleanText = stripMarkdown(text);
    if (cleanText.length === 0) {
      return NextResponse.json(
        { error: 'No readable text after cleaning' },
        { status: 400 }
      );
    }

    const clampedSpeed = Math.min(2.0, Math.max(0.5, speed));

    // Split into chunks for reliable TTS
    const chunks = splitIntoChunks(cleanText, 400);
    const voice = detectVoiceForText(cleanText);
    console.log(`TTS: voice=${voice}, totalChars=${cleanText.length}, chunks=${chunks.length}`);

    const zai = await ZAI.create();

    // Generate audio for each chunk and collect buffers
    const audioBuffers: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].slice(0, 500); // hard safety limit per chunk
      console.log(`TTS: generating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      const response = await zai.audio.tts.create({
        input: chunk,
        voice,
        speed: clampedSpeed,
        response_format: 'mp3', // MP3 is much smaller than WAV
        stream: false,
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      audioBuffers.push(buffer);
      console.log(`TTS: chunk ${i + 1} done, ${buffer.length} bytes`);
    }

    // Concatenate all MP3 buffers into one (MP3 supports simple concatenation)
    const totalBuffer = Buffer.concat(audioBuffers);
    console.log(`TTS: total audio ${totalBuffer.length} bytes (${audioBuffers.length} chunks)`);

    return new NextResponse(totalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': totalBuffer.length.toString(),
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
