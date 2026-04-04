import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationId } = await req.json();

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Message and conversationId are required' },
        { status: 400 }
      );
    }

    // Get conversation history
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, userId: session.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Build message history
    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'assistant',
        content:
          'You are a helpful, friendly, and knowledgeable AI assistant. You provide clear, accurate, and concise responses. You can help with coding, writing, analysis, creative tasks, and general questions. Use markdown formatting when appropriate for code blocks, lists, and emphasis.',
      },
      ...conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Save assistant message to database
    const savedMessage = await db.message.create({
      data: {
        content: aiResponse,
        role: 'assistant',
        conversationId,
      },
    });

    return NextResponse.json({
      message: {
        id: savedMessage.id,
        content: aiResponse,
        role: 'assistant',
        createdAt: savedMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}
