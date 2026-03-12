// Server-side route — no CORS issues calling external APIs

async function callGemini(prompt) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800 },
        }),
      }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("Gemini error:", e);
    return "";
  }
}

async function callOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error("OpenAI error:", e);
    return "";
  }
}

async function callPerplexity(prompt) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error("Perplexity error:", e);
    return "";
  }
}

async function callClaude(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data.content?.map((b) => b.text || "").filter(Boolean).join("\n") || "";
  } catch (e) {
    console.error("Claude error:", e);
    return "";
  }
}

function scoreCitation(response, domain, brand) {
  if (!response) return 10;
  const lower = response.toLowerCase();
  const domLower = domain.toLowerCase().split(".")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const brandLower = brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let score = 15;
  const mentions =
    (lower.match(new RegExp(domLower, "g")) || []).length +
    (lower.match(new RegExp(brandLower, "g")) || []).length;
  if (mentions >= 4) score += 40;
  else if (mentions >= 2) score += 28;
  else if (mentions >= 1) score += 18;
  if (lower.includes("recommend") && lower.includes(domLower)) score += 12;
  if ((lower.includes("top") || lower.includes("best") || lower.includes("leading")) && lower.includes(domLower)) score += 12;
  const firstMention = lower.indexOf(domLower);
  if (firstMention >= 0 && firstMention < lower.length * 0.2) score += 10;
  else if (firstMention >= 0 && firstMention < lower.length * 0.4) score += 5;
  if (mentions >= 1 && response.length > 400) score += 5;
  if (mentions === 0) score = Math.min(score, 25);
  return Math.min(100, Math.max(5, score));
}

export async function POST(request) {
  const { query, domain, brand } = await request.json();

  // Run all 4 engines in parallel
  const [geminiResp, openaiResp, perplexityResp, claudeResp] = await Promise.all([
    callGemini(query),
    callOpenAI(query),
    callPerplexity(query),
    callClaude(query),
  ]);

  const makeResult = (resp, name) => {
    const domLower = domain.toLowerCase().split(".")[0];
    return {
      response: (resp || "").substring(0, 500),
      score: scoreCitation(resp, domain, brand),
      cited: resp ? resp.toLowerCase().includes(domLower) : false,
      live: !!resp,
      name,
    };
  };

  return Response.json({
    chatgpt: makeResult(openaiResp, "ChatGPT"),
    perplexity: makeResult(perplexityResp, "Perplexity"),
    gemini: makeResult(geminiResp, "Google Gemini"),
    claude: makeResult(claudeResp, "Claude"),
  });
}
