import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Take last few messages for context (max 6)
    const recentMessages = messages.slice(-6);

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Based on the conversation context, suggest 3 short, relevant follow-up questions the user might want to ask. Each suggestion should be concise (under 60 characters), natural, and contextually relevant. Return ONLY a JSON array of 3 strings, nothing else. No markdown, no explanation, just the raw JSON array.',
        },
        ...recentMessages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    const responseText = completion.choices[0]?.message?.content || '[]';

    // Try to parse JSON from the response
    let suggestions: string[];
    try {
      // Extract JSON array from response (might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(responseText);
      }
    } catch {
      // Fallback: split by newlines and clean up
      suggestions = responseText
        .split('\n')
        .map((s: string) => s.replace(/^[\d.\-\s"']+|["']+$/g, '').trim())
        .filter((s: string) => s.length > 0 && s.length < 80)
        .slice(0, 3);
    }

    // Validate and limit
    suggestions = Array.isArray(suggestions)
      ? suggestions.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
      : [];

    if (suggestions.length === 0) {
      suggestions = ['Tell me more about this', 'Can you give an example?', 'What are the key points?'];
    }

    return NextResponse.json({ suggestions }, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('AI suggestions error:', error);
    return NextResponse.json(
      { suggestions: ['Tell me more', 'Can you elaborate?', 'What else should I know?'] },
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
