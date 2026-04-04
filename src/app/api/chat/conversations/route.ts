import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await db.conversation.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json();
    const conversation = await db.conversation.create({
      data: {
        userId: session.userId,
        title: title || 'New Chat',
      },
      include: { messages: true },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
