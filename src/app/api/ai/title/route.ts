import { NextRequest } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Generate a very short conversation title (max 50 characters, no quotes) based on the first message. Be concise and descriptive.',
        },
        ...messages,
      ],
    });

    let title = completion.choices[0]?.message?.content?.trim() || 'New Chat';

    // Strip surrounding quotes the AI might add
    title = title.replace(/^["']|["']$/g, '');

    // Enforce max length
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }

    return new Response(JSON.stringify({ title }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Title generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate title' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
