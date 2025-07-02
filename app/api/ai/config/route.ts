import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
      hasAnyKey: !!(
        process.env.OPENAI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.ANTHROPIC_API_KEY
      ),
      // For debugging - show partial keys (first 10 chars)
      openaiPartial: process.env.OPENAI_API_KEY
        ? process.env.OPENAI_API_KEY.substring(0, 10) + '...'
        : null,
      geminiPartial: process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? process.env.GOOGLE_GENERATIVE_AI_API_KEY.substring(0, 10) + '...'
        : null,
      claudePartial: process.env.ANTHROPIC_API_KEY
        ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...'
        : null,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error checking AI config:', error);
    return NextResponse.json(
      { error: 'Failed to check AI configuration' },
      { status: 500 }
    );
  }
}
