import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import ZAI from 'z-ai-web-dev-sdk';

// Simple in-memory translation cache
const translationCache = new Map<string, string>();

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and targetLanguage are required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text is too long (max 5000 characters)' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = `${targetLanguage}:${text.slice(0, 500)}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { translation: cached },
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      zh: 'Chinese',
      ja: 'Japanese',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ko: 'Korean',
      pt: 'Portuguese',
      ru: 'Russian',
      ar: 'Arabic',
      it: 'Italian',
      nl: 'Dutch',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text to ${targetLangName}. Return ONLY the translated text, nothing else. No explanations, no notes, no markdown formatting unless present in the original. Preserve the original formatting and structure.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    });

    const translation = completion.choices[0]?.message?.content || 'Translation failed.';

    // Cache the result
    if (translationCache.size > 1000) {
      // Clear oldest entries to prevent memory bloat
      const keys = Array.from(translationCache.keys());
      for (let i = 0; i < 200; i++) {
        translationCache.delete(keys[i]);
      }
    }
    translationCache.set(cacheKey, translation);

    return NextResponse.json(
      { translation },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
