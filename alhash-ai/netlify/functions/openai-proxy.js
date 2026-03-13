exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  const { message } = JSON.parse(event.body || "{}");
  if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: "No message provided" }) };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not configured" }) };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert AI financial advisor for Alhash AI, a licensed UAE fintech company based in Dubai's Meydan Free Zone. You help clients with financial planning, investment advice, and UAE regulatory guidance." },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message }) };

  return { statusCode: 200, headers, body: JSON.stringify({ reply: data.choices[0].message.content }) };
};
