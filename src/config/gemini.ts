// Gemini API Configuration
import Constants from 'expo-constants';

// Get API key from environment variables via Expo Constants
// Try multiple sources to ensure we get the key
const getApiKey = () => {
  // Try Constants.manifest first (older Expo versions)
  const manifestKey = Constants.manifest?.extra?.geminiApiKey;
  if (manifestKey) return manifestKey;
  
  // Try Constants.expoConfig (newer Expo versions)
  const configKey = Constants.expoConfig?.extra?.geminiApiKey;
  if (configKey) return configKey;
  
  // Try process.env as fallback
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  
  return '';
};

export const GEMINI_API_KEY = getApiKey();
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const generateGeminiResponse = async (
  prompt: string,
  systemPrompt?: string
): Promise<string> => {
  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === '' || GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('Gemini API key is not configured.');
      console.log('Constants.manifest?.extra:', Constants.manifest?.extra);
      console.log('Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
      console.log('process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set (hidden)' : 'Not set');
      return 'AI features are not configured. Please set GEMINI_API_KEY in your .env file in the project root and restart the Expo server.';
    }

    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\nUser: ${prompt}\nAssistant:`
      : prompt;

    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('No text in Gemini response:', data);
      throw new Error('No response from Gemini API');
    }

    return generatedText;
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    console.error('API Key (first 10 chars):', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET');
    
    // Return a more helpful error message
    if (error.message?.includes('API key')) {
      return 'Invalid API key. Please check your GEMINI_API_KEY in the .env file.';
    }
    return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please check your API configuration and try again.`;
  }
};

export const FITNESS_COACH_PROMPT = `You are a knowledgeable and supportive fitness coach assistant. Your role is to help users with their fitness journey by providing:

1. Exercise advice and workout recommendations
2. Nutrition guidance and meal planning tips
3. Motivation and encouragement
4. Answers to fitness-related questions
5. Health and wellness information

Always respond in medium-sized paragraphs (3-5 sentences per paragraph) that are informative, encouraging, and easy to understand. Be supportive and professional. If asked about medical conditions, always recommend consulting with a healthcare professional.`;
