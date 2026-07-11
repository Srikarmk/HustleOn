// Gemini access — routed through the Supabase Edge Function `gemini-proxy`.
// The API key lives only as a server-side secret, never in the app bundle.
import { supabase } from '../lib/supabase';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/** Shown near every AI surface. Fitness guidance, not medical advice. */
export const AI_DISCLAIMER =
  'AI guidance is general fitness information, not medical advice. Consult a healthcare professional before making health decisions.';

/**
 * Send a prompt to Gemini via the secure proxy.
 * Requires an authenticated Supabase session (the JWT is attached automatically).
 *
 * @param history Optional prior conversation turns for multi-turn context.
 *                Omit for single-turn calls (food analysis, BMI advice, etc.).
 */
export const generateGeminiResponse = async (
  prompt: string,
  systemPrompt?: string,
  history?: ChatTurn[]
): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { prompt, systemPrompt, history },
    });

    if (error) {
      console.error('gemini-proxy invoke error:', error);
      return 'I apologize, but I could not reach the AI service. Please try again in a moment.';
    }

    if (data?.error) {
      console.error('gemini-proxy returned error:', data.error);
      return `I apologize, but the AI service returned an error: ${data.error}`;
    }

    if (!data?.text) {
      return 'I apologize, but I received an empty response. Please try again.';
    }

    return data.text as string;
  } catch (error: any) {
    console.error('Error calling gemini-proxy:', error);
    return `I apologize, but I encountered an error: ${error?.message || 'Unknown error'}. Please try again.`;
  }
};

export const FITNESS_COACH_PROMPT = `You are a knowledgeable and supportive fitness coach assistant. Your role is to help users with their fitness journey by providing:

1. Exercise advice and workout recommendations
2. Nutrition guidance and meal planning tips
3. Motivation and encouragement
4. Answers to fitness-related questions
5. Health and wellness information

Always respond in medium-sized paragraphs (3-5 sentences per paragraph) that are informative, encouraging, and easy to understand. Be supportive and professional. If asked about medical conditions, always recommend consulting with a healthcare professional.`;
