import { NextRequest } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { db } from '@/lib/db';
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

    const { message, conversationId, systemPrompt, imageBase64 } = await req.json();

    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Message and conversationId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build message history
    const defaultSystemPrompt =
      'You are a helpful, friendly, and knowledgeable AI assistant. You provide clear, accurate, and concise responses. You can help with coding, writing, analysis, creative tasks, and general questions. Use markdown formatting when appropriate for code blocks, lists, and emphasis.';

    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      {
        role: 'assistant',
        content: systemPrompt || defaultSystemPrompt,
      },
      ...conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // If there's an attached image, include it as a multimodal message
    if (imageBase64) {
      const imageDataUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`;

      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: message,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: message,
      });
    }

    const zai = await ZAI.create();

    // Attempt streaming first
    let streamBody: ReadableStream<Uint8Array> | null = null;
    let fullContent = '';

    try {
      const result = await zai.chat.completions.create({
        messages: messages as any,
        thinking: { type: 'disabled' },
        stream: true,
      });

      // If streaming is supported, result should be a ReadableStream
      if (result && typeof result === 'object' && 'getReader' in result) {
        streamBody = result as ReadableStream<Uint8Array>;
      }
    } catch {
      // Streaming not available, fall back to non-streaming
    }

    if (streamBody) {
      // ── Streaming path ──────────────────────────────────────────
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const reader = streamBody!.getReader();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === '') continue;

                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.slice(6);

                  if (dataStr === '[DONE]') {
                    // Save message to DB
                    const savedMessage = await db.message.create({
                      data: {
                        content: fullContent,
                        role: 'assistant',
                        conversationId,
                      },
                    });

                    // Send final event with metadata
                    const finalEvent = JSON.stringify({
                      done: true,
                      id: savedMessage.id,
                      createdAt: savedMessage.createdAt.toISOString(),
                    });
                    controller.enqueue(encoder.encode(`data: ${finalEvent}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    return;
                  }

                  try {
                    const parsed = JSON.parse(dataStr);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                      fullContent += delta;
                      // Forward the SSE event to the client
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                    }
                  } catch {
                    // Skip malformed JSON chunks
                  }
                }
              }
            }

            // If stream ended without [DONE], still save and finalize
            if (fullContent) {
              const savedMessage = await db.message.create({
                data: {
                  content: fullContent,
                  role: 'assistant',
                  conversationId,
                },
              });

              const finalEvent = JSON.stringify({
                done: true,
                id: savedMessage.id,
                createdAt: savedMessage.createdAt.toISOString(),
              });
              controller.enqueue(encoder.encode(`data: ${finalEvent}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: 'Sorry, I could not generate a response.' })}\n\n`)
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          } catch (error) {
            // Send error through the stream
            const errorMsg = error instanceof Error ? error.message : 'Stream error';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ── Non-streaming fallback ────────────────────────────────────
    const completion = await zai.chat.completions.create({
      messages: messages as any,
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

    return new Response(
      JSON.stringify({
        message: {
          id: savedMessage.id,
          content: aiResponse,
          role: 'assistant',
          createdAt: savedMessage.createdAt,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate AI response' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
