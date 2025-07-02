import { NextRequest, NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai/factory';
import { DebateContext } from '@/lib/ai/base';
import { AIModel, DebateStage } from '@/lib/types';

export async function POST(request: NextRequest) {
  let model, stage, position, topic, previousMessages;
  
  try {
    ({ model, stage, position, topic, previousMessages } = await request.json());


    if (!model || !stage || !position || !topic) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create AI provider
    let provider;
    try {
      provider = AIProviderFactory.create(model);
    } catch (error) {
      console.error('Failed to create AI provider:', error);
      throw new Error(`Failed to create ${model.provider} provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Build context
    const context: DebateContext = {
      topic,
      stage,
      position,
      previousMessages: previousMessages || []
    };

    // Generate message
    const content = await provider.generateDebateMessage(context);
    

    return NextResponse.json({ content });
  } catch (error) {
    console.error('API: Error generating AI message:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      stage,
      position
    });
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate AI message',
        provider: model?.provider || 'unknown',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}