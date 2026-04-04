import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, userId: session.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const { content, role, imageUrl, imagePrompt, audioUrl } = await req.json();

    // Verify conversation belongs to user
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, userId: session.userId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const message = await db.message.create({
      data: {
        content,
        role: role || 'user',
        conversationId,
        imageUrl: imageUrl || null,
        imagePrompt: imagePrompt || null,
        audioUrl: audioUrl || null,
      },
    });

    // Auto-update title from first user message
    if (role === 'user' && conversation.title === 'New Chat') {
      const autoTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await db.conversation.update({
        where: { id: conversationId },
        data: { title: autoTitle },
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    await db.conversation.deleteMany({
      where: { id: conversationId, userId: session.userId },
    });

    return NextResponse.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
