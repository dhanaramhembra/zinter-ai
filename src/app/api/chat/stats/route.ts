import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // Get total conversations
    const totalConversations = await db.conversation.count({
      where: { userId },
    });

    // Get total messages
    const totalMessages = await db.message.count({
      where: {
        conversation: { userId },
      },
    });

    // Get average messages per conversation
    const avgMessagesPerConv =
      totalConversations > 0
        ? Math.round((totalMessages / totalConversations) * 10) / 10
        : 0;

    // Get most active day - count messages grouped by date
    const messagesByDate = await db.message.groupBy({
      by: ['createdAt'],
      where: {
        conversation: { userId },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    // A better approach: get all message creation dates and find the most common day
    const allMessages = await db.message.findMany({
      where: {
        conversation: { userId },
      },
      select: { createdAt: true },
    });

    // Group by date string
    const dayCounts: Record<string, number> = {};
    for (const msg of allMessages) {
      const day = new Date(msg.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }

    // Find most active day
    let mostActiveDay = 'N/A';
    let maxMessages = 0;
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxMessages) {
        maxMessages = count;
        mostActiveDay = day;
      }
    }

    return NextResponse.json({
      totalConversations,
      totalMessages,
      avgMessagesPerConv,
      mostActiveDay,
    });
  } catch (error) {
    console.error('Failed to fetch chat stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
