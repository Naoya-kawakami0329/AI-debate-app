'use server';

import { DebateState } from '../types';
import { DatabaseService } from '../services/database';
import { revalidatePath } from 'next/cache';

export async function saveDebateAction(
  debateState: DebateState
): Promise<{ success: boolean; debateId?: string; error?: string }> {
  try {
    const debateId = await DatabaseService.saveDebate(debateState);

    if (debateId) {
      revalidatePath('/');
      return { success: true, debateId };
    } else {
      console.error('Server action: DatabaseService.saveDebate returned null');
      return {
        success: false,
        error: 'Database service returned null - check Supabase configuration',
      };
    }
  } catch (error) {
    console.error('Error in saveDebateAction:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

export async function getRecentDebatesAction(limit: number = 10) {
  try {
    const debates = await DatabaseService.getRecentDebates(limit);
    return { success: true, debates };
  } catch (error) {
    console.error('Error in getRecentDebatesAction:', error);
    return {
      success: false,
      debates: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function addAudienceQuestionAction(
  debateId: string,
  question: string,
  author: string = 'Anonymous'
) {
  try {
    const success = await DatabaseService.addAudienceQuestion(
      debateId,
      question,
      author
    );
    if (success) {
      revalidatePath('/');
    }
    return { success };
  } catch (error) {
    console.error('Error in addAudienceQuestionAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
