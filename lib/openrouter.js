export async function generateQuestionsWithOpenRouter({ apiKey, model, prompt }) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${await response.text()}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content ?? "";
}
