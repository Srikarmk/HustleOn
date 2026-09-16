// The "Share Data with AI" toggle must block prompts that embed the user's
// logged data. It was rendered in the UI without ever being read, so weight,
// BMI and meal history went to Gemini regardless of its position.
const mockInvoke = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { generateGeminiResponse, AI_DATA_SHARING_DISABLED } from '../gemini';
import { useStore } from '../../store';

beforeEach(() => {
  jest.clearAllMocks();
  mockInvoke.mockResolvedValue({ data: { text: 'coach reply' }, error: null });
});

const setSharing = (shareDataWithAI: boolean) =>
  useStore.setState({ privacySettings: { cloudSync: true, analytics: true, shareDataWithAI } });

describe('shareDataWithAI gate', () => {
  it('blocks a data-bearing prompt when sharing is off, without calling the proxy', async () => {
    setSharing(false);

    const reply = await generateGeminiResponse('My BMI is 24', undefined, undefined, {
      includesUserData: true,
    });

    expect(reply).toBe(AI_DATA_SHARING_DISABLED);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('allows a data-bearing prompt when sharing is on', async () => {
    setSharing(true);

    const reply = await generateGeminiResponse('My BMI is 24', undefined, undefined, {
      includesUserData: true,
    });

    expect(reply).toBe('coach reply');
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('still allows the AI chat when sharing is off (the user types those messages)', async () => {
    setSharing(false);

    const reply = await generateGeminiResponse('How do I squat?');

    expect(reply).toBe('coach reply');
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
