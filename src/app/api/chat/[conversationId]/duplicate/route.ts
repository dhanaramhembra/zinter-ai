import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Verify conversation belongs to user and include messages
    const original = await db.conversation.findFirst({
      where: { id: conversationId, userId: session.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Create a new conversation with copied title + " (Copy)"
    const newTitle =
      original.title.length > 95
        ? original.title.slice(0, 95) + '… (Copy)'
        : original.title + ' (Copy)';

    const newConversation = await db.conversation.create({
      data: {
        title: newTitle,
        userId: session.userId,
        messages: {
          create: original.messages.map((msg) => ({
            content: msg.content,
            role: msg.role,
            imageUrl: msg.imageUrl,
            imagePrompt: msg.imagePrompt,
            audioUrl: msg.audioUrl,
          })),
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ conversation: newConversation }, { status: 201 });
  } catch (error) {
    console.error('Duplicate conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate conversation' },
      { status: 500 }
    );
  }
}
