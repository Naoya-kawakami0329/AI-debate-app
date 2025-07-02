import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Enable dynamic API route
export const dynamic = 'force-dynamic';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Fallback to browser's speech synthesis indicator
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 501 }
      );
    }

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: speed,
    });

    // Convert to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Return audio as response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
