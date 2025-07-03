import {
  supabase,
  createSupabaseAdmin,
} from '../supabase/client';
import {
  DebateState,
  AIModel,
  DebateTopic,
  TrendingTopic,
} from '../types';

export class DatabaseService {
  // Get the appropriate Supabase client (server-side for server actions, client-side for browser)
  private static getSupabaseClient() {
    // Check if we're running on the server (Node.js environment)
    if (typeof window === 'undefined') {
      // Server-side: use admin client
      return createSupabaseAdmin();
    } else {
      // Client-side: use regular client
      return supabase;
    }
  }

  // Helper method to check if Supabase operations are available
  private static isAvailable(): boolean {
    const client = this.getSupabaseClient();
    return !!client;
  }

  // Ensure topic exists in database, create if it doesn't
  private static async ensureTopicExists(topic: DebateTopic): Promise<string> {
    const client = this.getSupabaseClient();
    if (!client) {
      throw new Error('Supabase not available');
    }

    try {
      // First try to find existing topic
      const { data: existingTopic } = await client
        .from('topics')
        .select('id')
        .eq('title', topic.title)
        .single();

      if (existingTopic) {
        return existingTopic.id;
      }

      // Create new topic if it doesn't exist
      const { data: newTopic, error } = await client
        .from('topics')
        .insert({
          title: topic.title,
          description: topic.description,
          category: topic.category,
          trending: topic.trending || false,
        })
        .select('id')
        .single();

      if (error) throw error;
      return newTopic.id;
    } catch (error) {
      console.error('Error ensuring topic exists:', error);
      throw error;
    }
  }

  // Ensure AI model exists in database, create if it doesn't
  private static async ensureModelExists(model: AIModel): Promise<string> {
    const client = this.getSupabaseClient();
    if (!client) {
      throw new Error('Supabase not available');
    }

    try {
      // First try to find existing model
      const { data: existingModel } = await client
        .from('ai_models')
        .select('id')
        .eq('name', model.name)
        .single();

      if (existingModel) {
        return existingModel.id;
      }

      // Create new model if it doesn't exist
      const { data: newModel, error } = await client
        .from('ai_models')
        .insert({
          name: model.name,
          provider: model.provider,
          description: model.description,
          avatar: model.avatar,
        })
        .select('id')
        .single();

      if (error) throw error;
      return newModel.id;
    } catch (error) {
      console.error('Error ensuring model exists:', error);
      throw error;
    }
  }

  // Fetch debate topics from database
  static async getTopics(): Promise<DebateTopic[]> {
    const client = this.getSupabaseClient();
    if (!client) {
      return [];
    }

    try {
      // Only fetch topics that haven't been used in debates yet
      const { data: usedTopicIds, error: usedError } = await client
        .from('debates')
        .select('topic_id')
        .not('topic_id', 'is', null);

      if (usedError) throw usedError;

      const usedIds = usedTopicIds?.map((d) => d.topic_id) || [];

      // Fetch topics that are either trending or haven't been used
      const { data, error } = await client
        .from('topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description || '',
        category: topic.category,
        trending: topic.trending,
      }));
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
  }

  // Save debate to database
  static async saveDebate(debateState: DebateState): Promise<string | null> {
    const client = this.getSupabaseClient();
    if (!client) {
      console.error('Supabase is not available');
      return null;
    }

    try {
      // First, ensure topic exists in database
      let topicId = await this.ensureTopicExists(debateState.config.topic);

      // Ensure AI models exist in database
      let proModelId = await this.ensureModelExists(
        debateState.config.proModel
      );
      let conModelId = await this.ensureModelExists(
        debateState.config.conModel
      );

      // Save debate
      const { data: debateData, error: debateError } = await client
        .from('debates')
        .insert({
          topic_id: topicId,
          pro_model_id: proModelId,
          con_model_id: conModelId,
          stage: debateState.stage,
          current_speaker: debateState.currentSpeaker,
          winner: debateState.winner,
          summary: debateState.summary,
          duration: debateState.config.duration,
          start_time: debateState.startTime.toISOString(),
        })
        .select()
        .single();

      if (debateError) {
        console.error('Database error when saving debate:', debateError);
        throw debateError;
      }

      const debateId = debateData.id;

      // Save messages
      if (debateState.messages.length > 0) {
        // For each message, ensure the model ID exists and get the correct DB ID
        const messagesData = await Promise.all(
          debateState.messages.map(async (message) => {
            const dbModelId = await this.ensureModelExists(message.model);
            return {
              debate_id: debateId,
              speaker: message.speaker,
              ai_model_id: dbModelId,
              content: message.content,
              stage: message.stage,
              reactions: message.reactions,
              created_at: message.timestamp.toISOString(),
            };
          })
        );

        const { data: savedMessages, error: messagesError } = await client
          .from('debate_messages')
          .insert(messagesData)
          .select('id');

        if (messagesError) throw messagesError;

        // Save evidence for each message using the returned database message IDs
        if (savedMessages && savedMessages.length > 0) {
          for (let i = 0; i < debateState.messages.length; i++) {
            const message = debateState.messages[i];
            const savedMessage = savedMessages[i];

            if (message.evidence.length > 0 && savedMessage) {
              const evidenceData = message.evidence.map((evidence) => ({
                message_id: savedMessage.id,
                url: evidence.url,
                title: evidence.title,
                source: evidence.source,
                snippet: evidence.snippet,
                credibility: evidence.credibility,
              }));

              const { error: evidenceError } = await client
                .from('evidence')
                .insert(evidenceData);

              if (evidenceError) {
                console.error(
                  'Error saving evidence for message:',
                  evidenceError
                );
                // Don't throw here to prevent failing the entire debate save
              }
            }
          }
        }
      }

      // Save audience questions
      if (debateState.audienceQuestions.length > 0) {
        const questionsData = debateState.audienceQuestions.map((question) => ({
          debate_id: debateId,
          question: question.question,
          author: question.author,
          votes: question.votes,
          answered: question.answered,
          created_at: question.timestamp.toISOString(),
        }));

        const { error: questionsError } = await client
          .from('audience_questions')
          .insert(questionsData);

        if (questionsError) throw questionsError;
      }

      return debateId;
    } catch (error) {
      console.error('Error saving debate:', error);
      return null;
    }
  }

  // Fetch recent debates
  static async getRecentDebates(limit: number = 10) {
    const client = this.getSupabaseClient();
    if (!client) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('debates')
        .select(
          `
          *,
          topics (title, category),
          pro_model:ai_models!debates_pro_model_id_fkey (name, avatar),
          con_model:ai_models!debates_con_model_id_fkey (name, avatar),
          debate_messages (
            id,
            speaker,
            content,
            stage,
            reactions,
            created_at,
            ai_model_id,
            evidence (
              id,
              url,
              title,
              source,
              snippet,
              credibility
            )
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((debate) => ({
        id: debate.id,
        topic: debate.topics?.title || 'Unknown Topic',
        models: [
          debate.pro_model?.name || 'Unknown',
          debate.con_model?.name || 'Unknown',
        ] as [string, string],
        duration: (() => {
          const startTime = new Date(debate.start_time || debate.created_at);
          const endTime = new Date(debate.end_time || debate.updated_at);
          const durationMs = endTime.getTime() - startTime.getTime();
          const minutes = Math.floor(durationMs / 60000);
          return minutes > 0 ? `${minutes}分` : '1分未満';
        })(),
        winner:
          debate.winner === 'pro'
            ? debate.pro_model?.name || 'Pro'
            : debate.winner === 'con'
              ? debate.con_model?.name || 'Con'
              : '引き分け',
        status: debate.stage === 'summary' ? '完了' : '進行中',
        createdAt: debate.created_at,
        messages: debate.debate_messages
          ? debate.debate_messages
              .sort(
                (a: any, b: any) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              )
              .map((msg: any) => ({
                id: msg.id,
                speaker: msg.speaker,
                content: msg.content,
                stage: msg.stage,
                reactions: msg.reactions,
                timestamp: new Date(msg.created_at),
                evidence: msg.evidence || [],
              }))
          : [],
      }));
    } catch (error) {
      console.error('Error fetching recent debates:', error);
      return [];
    }
  }

  // Save trending topics to cache
  static async saveTrendingTopics(trends: TrendingTopic[]): Promise<void> {
    const client = this.getSupabaseClient();
    if (!client) {
      return;
    }

    try {
      // Clear old trending topics (older than 24 hours)
      await client
        .from('trending_topics')
        .delete()
        .lt(
          'last_updated',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        );

      // Insert new trending topics
      const trendsData = trends.map((trend) => ({
        keyword: trend.keyword,
        trend: trend.trend,
        source: trend.source,
        category: trend.category,
        description: trend.description,
        search_volume: trend.searchVolume,
        news_count: trend.newsCount,
        last_updated: trend.lastUpdated,
      }));

      const { error } = await client.from('trending_topics').insert(trendsData);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving trending topics:', error);
    }
  }

  // Fetch cached trending topics
  static async getCachedTrendingTopics(): Promise<TrendingTopic[]> {
    const client = this.getSupabaseClient();
    if (!client) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('trending_topics')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map((trend) => ({
        keyword: trend.keyword,
        trend: trend.trend,
        source: trend.source,
        category: trend.category,
        description: trend.description || '',
        lastUpdated: trend.last_updated,
        searchVolume: trend.search_volume,
        newsCount: trend.news_count,
      }));
    } catch (error) {
      console.error('Error fetching cached trending topics:', error);
      return [];
    }
  }

  // Get AI models from database
  static async getAIModels(): Promise<AIModel[]> {
    const client = this.getSupabaseClient();
    if (!client) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('ai_models')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Remove duplicates based on name and provider
      const uniqueModels = data.reduce((acc, model) => {
        const key = `${model.name}-${model.provider}`;
        if (!acc.has(key)) {
          acc.set(key, {
            id: model.id,
            name: model.name,
            provider: model.provider,
            description: model.description || '',
            avatar: model.avatar || '🤖',
          });
        }
        return acc;
      }, new Map());

      return Array.from(uniqueModels.values());
    } catch (error) {
      console.error('Error fetching AI models:', error);
      return [];
    }
  }

  // Add audience question
  static async addAudienceQuestion(
    debateId: string,
    question: string,
    author: string = 'Anonymous'
  ): Promise<boolean> {
    const client = this.getSupabaseClient();
    if (!client) {
      return false;
    }

    try {
      const { error } = await client.from('audience_questions').insert({
        debate_id: debateId,
        question,
        author,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding audience question:', error);
      return false;
    }
  }

  // Add user note
  static async addUserNote(
    debateId: string,
    content: string
  ): Promise<boolean> {
    const client = this.getSupabaseClient();
    if (!client) {
      return false;
    }

    try {
      const { error } = await client.from('user_notes').insert({
        debate_id: debateId,
        content,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding user note:', error);
      return false;
    }
  }

  // Get user notes for a debate
  static async getUserNotes(debateId: string) {
    const client = this.getSupabaseClient();
    if (!client) {
      return [];
    }

    try {
      const { data, error } = await client
        .from('user_notes')
        .select('*')
        .eq('debate_id', debateId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((note) => ({
        id: note.id,
        content: note.content,
        author: note.author,
        timestamp: new Date(note.created_at),
      }));
    } catch (error) {
      console.error('Error fetching user notes:', error);
      return [];
    }
  }
}
