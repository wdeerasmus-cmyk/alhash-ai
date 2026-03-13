exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { message } = JSON.parse(event.body || "{}");
  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: "No message provided" }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
  }

  const payload = {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an expert AI financial advisor for Alhash AI, a licensed UAE fintech company based in Dubai's Meydan Free Zone. You help UAE entrepreneurs and investors with investment advisory, personal finance, and business intelligence. Be concise, professional, and always remind users that this is general information and not personalised financial advice. Keep responses under 150 words."
      },
      { role: "user", content: message }
    ],
    max_tokens: 300,
    temperature: 0.7
  };

  const body = JSON.stringify(payload);
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    }
  };

  try {
    const fetch = (await import("node-fetch")).default;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      ...options,
      body
    });
    const data = await res.json();
    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
    }
    const reply = data.choices[0].message.content.trim();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
