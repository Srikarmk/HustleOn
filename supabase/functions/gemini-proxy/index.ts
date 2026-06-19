// HustleOn — Gemini proxy Edge Function (Deno runtime).
//
// Holds GEMINI_API_KEY as a server secret so it never ships in the app bundle.
// Only authenticated users can call it (the JWT is verified). The client sends
// { prompt, systemPrompt }; we forward to Gemini and return { text }.
//
// Deploy:  supabase functions deploy gemini-proxy
// Secret:  supabase secrets set GEMINI_API_KEY=AIza...
//
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401);
    }

    // Verify the caller is a real, signed-in user.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized.' }, 401);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return json({ error: 'AI is not configured on the server.' }, 500);
    }

    const { prompt, systemPrompt, history } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return json({ error: 'Missing prompt.' }, 400);
    }

    // Build multi-turn contents: prior history (if any) + the current user turn.
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        if (
          turn &&
          typeof turn.text === 'string' &&
          (turn.role === 'user' || turn.role === 'model')
        ) {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const requestBody: Record<string, unknown> = { contents };
    if (systemPrompt && typeof systemPrompt === 'string') {
      requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, detail);
      return json({ error: `Gemini API error: ${geminiResponse.status}` }, 502);
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('No text in Gemini response:', JSON.stringify(data));
      return json({ error: 'No response from Gemini.' }, 502);
    }

    return json({ text }, 200);
  } catch (error) {
    console.error('gemini-proxy error:', error);
    return json({ error: 'Internal error.' }, 500);
  }
});
