import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Try to list available models
    // Note: This might not work with all API keys, but it's worth trying
    const models = [
      "gemini-pro",
      "gemini-1.0-pro",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp",
    ];

    const results = [];
    
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Try a simple test call
        const result = await model.generateContent("test");
        results.push({ model: modelName, status: "available" });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ 
          model: modelName, 
          status: "unavailable", 
          error: errorMsg 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Model availability test",
        results,
        recommendation: results.find(r => r.status === "available")?.model || "None available"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


