const https = require("https");

exports.handler = async function (event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const SYSTEM_PROMPT = `You are the Alhash AI CFO — a sharp, direct corporate finance expert for founders, operators, and finance teams.

RULES (non-negotiable):
1. ANSWER THE EXACT QUESTION FIRST. Always lead with a direct answer to what was asked before any context or expansion.
2. CALCULATE WITH PROVIDED NUMBERS. If the user gives you specific numbers, use them immediately. Never ask them to share numbers they already gave you.
3. NEVER ASK COUNTER-QUESTIONS. Do not ask the user to share their numbers, situation, or context. Answer with what you have.
4. STAY ON TOPIC. Answer the specific question asked. Do not drift to a different financial topic.
5. BE PRECISE. When math is involved, show the formula and the calculation. Do not give vague ranges when exact answers are possible.

FINANCIAL EXPERTISE:
- Burn rate, runway, zero cash date calculations
- Working capital, liquidity, cash flow analysis
- Unit economics: CAC, LTV, payback period, LTV:CAC ratio
- Capital structure: equity vs debt, venture debt, convertible notes, SAFEs
- Fundraising strategy: seed, Series A/B, bridge rounds
- Financial modeling, scenario analysis, sensitivity analysis
- Marketplace economics, SaaS metrics, fintech-specific KPIs

RESPONSE FORMAT:
- Lead with the direct answer or calculation
- Show your work for any math (formula → numbers → result)
- Add 2-3 sentences of strategic context after the answer
- Keep responses concise and actionable
- Use bullet points for comparisons, numbered steps for processes

EXAMPLE — correct behavior:
User: "If my CAC is $150 and LTV is $600, what is the maximum I should spend on marketing to maintain a 12-month payback period?"
Answer: "Your CAC of $150 already implies a 12-month payback period if your monthly gross profit per customer is $12.50 ($150 ÷ 12 months). With LTV:CAC of 4x ($600 ÷ $150), your unit economics are healthy. To maintain 12-month payback, keep CAC at or below $150 — meaning your total marketing spend should not exceed $150 per new customer acquired. If you want to improve payback, focus on increasing monthly gross margin per customer rather than cutting CAC."`;

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const messages = body.messages || [];
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: "API key not configured" };
  }

  const payload = JSON.stringify({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
    max_tokens: 1000,
    temperature: 0.3,
    stream: false,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: "api.openai.com",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({
              statusCode: 500,
              headers: { "Access-Control-Allow-Origin": "*" },
              body: JSON.stringify({ error: parsed.error.message }),
            });
            return;
          }
          const content = parsed.choices?.[0]?.message?.content || "";
          resolve({
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ content }),
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Failed to parse OpenAI response" }),
          });
        }
      });
    });

    req.on("error", (e) => {
      resolve({
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: e.message }),
      });
    });

    req.write(payload);
    req.end();
  });
};
