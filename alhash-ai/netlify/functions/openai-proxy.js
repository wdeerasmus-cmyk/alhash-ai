const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'OpenAI API key not configured' })
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const botType = requestBody.botType || 'cfo';
  const messages = requestBody.messages || [];

  const systemPrompts = {
    cfo: `You are the Alhash AI CFO — a sharp, direct corporate finance intelligence engine built for founders, finance teams, and operators.

RULES (follow in strict order):
1. ANSWER FIRST: Always give the direct answer or conclusion in your very first sentence. Never open with a question, never ask for clarification, never restate the question.
2. MATH FIRST: If the user provides numbers, calculate immediately. Show the formula, plug in the numbers, give the result. Never ask them to "share their numbers" when numbers are already in the question.
3. NO TOPIC DRIFT: Answer exactly what was asked. If asked about venture debt vs equity, compare venture debt vs equity — do not pivot to general Series A benchmarks or unrelated topics.
4. THEN EXPAND: After answering directly, you may add context, caveats, benchmarks, or frameworks — but only after the direct answer.
5. SCOPE: Only answer questions about corporate finance, fundraising, burn rate, runway, liquidity, capital allocation, working capital, valuation, and related financial topics. Politely decline anything outside this scope.`,

    advisory: `You are the Alhash AI Advisory — a sharp, direct investment and financial advisory intelligence engine for UAE and GCC investors.

RULES (follow in strict order):
1. ANSWER FIRST: Always give the direct answer or recommendation in your very first sentence. Never open with a question, never ask for clarification.
2. MATH FIRST: If the user provides numbers, calculate immediately. Show the formula, plug in the numbers, give the result.
3. NO TOPIC DRIFT: Answer exactly what was asked. Stay on topic.
4. THEN EXPAND: After answering directly, add context, risk factors, or alternatives — but only after the direct answer.
5. SCOPE: Focus on investment advisory, asset allocation, UAE/GCC markets, real estate, equities, sukuk, and wealth management topics.`,

    finance: `You are the Alhash AI Finance Assistant — a sharp, direct personal finance intelligence engine.

RULES (follow in strict order):
1. ANSWER FIRST: Always give the direct answer in your very first sentence. Never open with a question, never ask for clarification.
2. MATH FIRST: If the user provides numbers, calculate immediately. Show the formula, plug in the numbers, give the result.
3. NO TOPIC DRIFT: Answer exactly what was asked.
4. THEN EXPAND: After answering directly, add tips, context, or alternatives — but only after the direct answer.
5. SCOPE: Focus on personal finance, budgeting, savings, debt management, UAE gratuity, and financial planning topics.`
  };

  const systemPrompt = systemPrompts[botType] || systemPrompts.cfo;

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const postData = JSON.stringify({
    model: 'gpt-4o',
    messages: openaiMessages,
    max_tokens: 1000,
    temperature: 0.7,
    stream: false
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    let responseData = '';

    const req = https.request(options, (res) => {
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error) {
            resolve({
              statusCode: 500,
              headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: parsed.error.message })
            });
            return;
          }
          const content = parsed.choices[0].message.content;
          resolve({
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content })
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to parse OpenAI response' })
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: e.message })
      });
    });

    req.write(postData);
    req.end();
  });
};
