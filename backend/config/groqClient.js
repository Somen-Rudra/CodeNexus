/* =========================
   Groq API Client
   Model: llama-3.3-70b-versatile
   Requires GROQ_API_KEY in env
========================= */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Calls Groq chat completions endpoint.
 *
 * @param {Object} opts
 * @param {string} opts.system   - system prompt (sets behavior + output schema)
 * @param {string} opts.user     - user prompt (the actual data/question)
 * @param {boolean} [opts.jsonMode=true] - force JSON object response
 * @param {number} [opts.temperature=0.3]
 * @param {number} [opts.maxTokens=1500]
 * @returns {Promise<string>} raw text content from the model
 */
export const callGroq = async ({
  system,
  user,
  jsonMode = true,
  temperature = 0.3,
  maxTokens = 1500,
}) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in environment variables");
  }

  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from Groq API");
  }

  return content;
};

/**
 * Safely parses JSON returned by the model.
 * Falls back to extracting the first {...} block if the model
 * wraps the JSON in markdown fences or extra text.
 *
 * @param {string} raw
 * @returns {Object}
 */
export const parseAIJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);

    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through
      }
    }

    throw new Error("Failed to parse AI response as JSON");
  }
};