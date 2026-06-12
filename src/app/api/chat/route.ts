import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { message, name, tone, knowledgeBase } = await req.json();

    // Basic request validation
    if (!message || !name || !tone || !knowledgeBase) {
      return NextResponse.json(
        { error: "Missing required parameters: message, name, tone, and knowledgeBase are required." },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    let openai: OpenAI;
    let modelName = "gpt-4o-mini";

    if (openaiApiKey && openaiApiKey.trim() !== "" && openaiApiKey !== "your-api-key-here") {
      // Use OpenAI
      openai = new OpenAI({ apiKey: openaiApiKey });
    } else if (groqApiKey && groqApiKey.trim() !== "" && groqApiKey !== "your-api-key-here") {
      // Use Groq with OpenAI-compatible endpoint
      openai = new OpenAI({
        apiKey: groqApiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });
      modelName = "llama-3.3-70b-versatile"; // High performance Llama model on Groq
    } else {
      // Fallback mode if neither key is configured
      console.warn("Neither OPENAI_API_KEY nor GROQ_API_KEY is configured. Running in simulated fallback mode.");
      const response = simulateFallbackResponse(message, name, tone, knowledgeBase);
      return NextResponse.json({
        response,
        fallback: true,
        warning: "API keys are not set. Running in local simulation mode."
      });
    }

    // Construct the strict system prompt instructing the AI
    const systemPrompt = `You are the digital twin of the expert: ${name}.
Your tone of voice is ${tone}.
You must strictly act like ${name} and adopt the specified tone in all your responses:
- If tone is Professional: Be formal, structured, precise, clear, and authoritative.
- If tone is Casual: Be conversational, friendly, use simple everyday language, and speak like a peer.
- If tone is Witty: Be clever, engaging, and inject light humor, wordplay, or sharp, smart responses where appropriate.

CRITICAL DIRECTIVE: You must ONLY use the provided Knowledge Base below to answer any questions. 
If the answer or information cannot be found or reasonably inferred from the Knowledge Base, you must explicitly state that you do not know or that your knowledge base does not contain that information. 
Do NOT invent, hallucinate, or utilize any external facts or assumptions outside this knowledge base. Do not make up facts.

Knowledge Base:
${knowledgeBase}`;

    // Call API (OpenAI or Groq client)
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.5, // lower temperature for stricter adherence to knowledge base
    });

    const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I could not formulate a response.";

    return NextResponse.json({
      response: aiResponse,
      fallback: false,
      model: modelName
    });

  } catch (error: any) {
    console.error("Error in AI Chat API Route Handler:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Simulated fallback response when API keys are missing
function simulateFallbackResponse(
  userMsg: string,
  name: string,
  tone: string,
  knowledgeBase: string
): string {
  const msg = userMsg.toLowerCase();
  
  // Split knowledge base into readable sentences
  const sentences = knowledgeBase
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  // Find a sentence that matches keyword in the message
  let matchingSentence = "";
  const words = msg.split(/\s+/).filter((w) => w.length > 3);
  
  for (const word of words) {
    const found = sentences.find((s) => s.toLowerCase().includes(word));
    if (found) {
      matchingSentence = found;
      break;
    }
  }
  
  // Default to a random sentence if no direct keyword match is found
  if (!matchingSentence && sentences.length > 0) {
    matchingSentence = sentences[Math.floor(Math.random() * sentences.length)];
  }

  const statement = matchingSentence 
    ? `"${matchingSentence}"`
    : "my core knowledge base documentation";

  if (tone === "Professional") {
    return `[Simulation] As the digital twin of ${name}, I have reviewed your query. Based strictly on the provided knowledge base, I can state: ${statement}. Other inquiries are outside my current database.`;
  } else if (tone === "Witty") {
    return `[Simulation] Beep boop! ${name}'s digital duplicate online in witty mode! Searching local disk... Ah, here: ${statement}. Ask me something else, unless you're afraid of my intelligence!`;
  } else {
    // Casual
    return `[Simulation] Hey! ${name} here. Regarding that, my notes say: ${statement}. Hope that helps! Let me know if you want to chat about anything else in my notes.`;
  }
}
