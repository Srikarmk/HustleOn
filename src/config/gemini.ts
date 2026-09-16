// Gemini access — routed through the Supabase Edge Function `gemini-proxy`.
// The API key lives only as a server-side secret, never in the app bundle.
import { supabase } from '../lib/supabase';
import { captureError } from '../lib/monitoring';
import { useStore } from '../store';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/** Shown near every AI surface. Fitness guidance, not medical advice. */
export const AI_DISCLAIMER =
  'AI guidance is general fitness information, not medical advice. Consult a healthcare professional before making health decisions.';

/** Message shown when a data-bearing AI request is blocked by the privacy toggle. */
export const AI_DATA_SHARING_DISABLED =
  "Personalised AI insights are off because “Share Data with AI” is disabled. You can turn it back on in Profile → Privacy, or keep it off and ask the AI coach directly — the coach only sees what you type.";

export interface GeminiOptions {
  /**
   * True when the prompt embeds the user's logged data (weight, BMI, meals,
   * workout history). Those calls are gated on the `shareDataWithAI` privacy
   * toggle. Leave false/undefined for the AI chat, where the user writes the
   * message themselves and is therefore volunteering whatever it contains.
   */
  includesUserData?: boolean;
}

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
  history?: ChatTurn[],
  options?: GeminiOptions
): Promise<string> => {
  // Enforce the privacy toggle before anything leaves the device. This switch
  // was previously rendered but never read, so logged health data was sent to
  // Gemini regardless of its position.
  if (options?.includesUserData && !useStore.getState().privacySettings.shareDataWithAI) {
    return AI_DATA_SHARING_DISABLED;
  }

  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { prompt, systemPrompt, history },
    });

    if (error) {
      captureError(error, { scope: 'gemini.invoke' });
      return 'I apologize, but I could not reach the AI service. Please try again in a moment.';
    }

    if (data?.error) {
      captureError(new Error(String(data.error)), { scope: 'gemini.response' });
      return `I apologize, but the AI service returned an error: ${data.error}`;
    }

    if (!data?.text) {
      return 'I apologize, but I received an empty response. Please try again.';
    }

    return data.text as string;
  } catch (error: any) {
    captureError(error, { scope: 'gemini' });
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
