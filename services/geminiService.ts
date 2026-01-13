// services/geminiService.ts

// Função que envia o prompt para o Worker
export async function generateText(prompt: string) {
  try {
    const res = await fetch("https://gemini-api-worker.mauricio-junior.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      throw new Error("Erro ao gerar texto do Worker");
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Erro no GeminiService:", err.message);
    throw err;
  }
}
