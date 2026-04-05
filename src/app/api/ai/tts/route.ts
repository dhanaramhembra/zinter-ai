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

/**
 * Split text into chunks by sentences, each ~400 chars max.
 */
function splitIntoChunks(text: string, maxLen = 400): string[] {
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

/**
 * Read WAV header parameters from a Buffer.
 * Standard WAV: 44-byte header, PCM 16-bit little-endian.
 */
function parseWavHeader(buf: Buffer): {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataOffset: number;
} {
  const numChannels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  const dataOffset = buf.readUInt32LE(16) + 8; // chunkSize + 8 for "data" tag
  return { numChannels, sampleRate, bitsPerSample, dataOffset };
}

/**
 * Build a valid WAV file from raw PCM samples.
 */
function buildWav(pcmData: Buffer, numChannels: number, sampleRate: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize, 0);
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // sub-chunk size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Merge multiple WAV buffers into a single valid WAV file.
 * All chunks must have the same sample rate, channels, and bits per sample.
 */
function mergeWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];

  // Parse first WAV to get format info
  const first = parseWavHeader(buffers[0]);

  // Extract raw PCM data from each WAV (skip header)
  const pcmParts: Buffer[] = [];
  for (const buf of buffers) {
    const info = parseWavHeader(buf);
    pcmParts.push(buf.subarray(info.dataOffset));
  }

  // Combine all PCM data and build a single WAV
  const combinedPcm = Buffer.concat(pcmParts);
  return buildWav(combinedPcm, first.numChannels, first.sampleRate, first.bitsPerSample);
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

    // Split into chunks
    const chunks = splitIntoChunks(cleanText, 400);
    const voice = detectVoiceForText(cleanText);
    console.log(`TTS: voice=${voice}, totalChars=${cleanText.length}, chunks=${chunks.length}`);

    const zai = await ZAI.create();

    // Generate audio for each chunk
    const audioBuffers: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].slice(0, 500);
      console.log(`TTS: chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      const response = await zai.audio.tts.create({
        input: chunk,
        voice,
        speed: clampedSpeed,
        response_format: 'wav',
        stream: false,
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      audioBuffers.push(buffer);
      console.log(`TTS: chunk ${i + 1} done, ${buffer.length} bytes`);
    }

    // Properly merge WAV chunks into one valid WAV file
    const mergedBuffer = mergeWavBuffers(audioBuffers);
    console.log(`TTS: merged ${audioBuffers.length} chunks → ${mergedBuffer.length} bytes`);

    return new NextResponse(mergedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': mergedBuffer.length.toString(),
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
