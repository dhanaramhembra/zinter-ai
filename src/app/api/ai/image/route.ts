import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import ZAI from 'z-ai-web-dev-sdk';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: prompt,
      size: '1024x1024',
    });

    const imageBase64 = response.data[0].base64;

    // Return base64 data URL instead of saving to filesystem
    // (Vercel serverless has read-only filesystem)
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
