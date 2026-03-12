export async function POST(request) {
  const { messages, useSearch } = await request.json();
  
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages,
  };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const text = data.content?.map((b) => b.text || "").filter(Boolean).join("\n") || "";
    return Response.json({ text });
  } catch (e) {
    return Response.json({ text: "", error: e.message }, { status: 500 });
  }
}
