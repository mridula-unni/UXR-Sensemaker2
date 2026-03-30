import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const geminiModel = ai.models.get({ model: "gemini-3.1-pro-preview" });

export async function generatePersonas(clusters: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Based on these UX research clusters: ${clusters.join(", ")}, generate 2-3 distinct user personas. 
      Return a JSON array of objects with: name, role, frustrations (array), goals (array), bio.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    console.error("Persona Generation Error:", error);
    if (error.message?.includes("quota") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429) {
      throw new Error("API Quota Exceeded: Please try again in a few minutes or check your Gemini API plan.");
    }
    throw error;
  }
}

export async function personaChat(persona: any, userPitch: string, history: any[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        { text: `You are ${persona.name}, a ${persona.role}. Your frustrations are: ${persona.frustrations.join(", ")}. Your goals are: ${persona.goals.join(", ")}. 
        A UX researcher is pitching this concept to you: "${userPitch}". 
        Respond as this persona, pushing back on the concept based on your systemic constraints and frustrations. Be critical but constructive.` },
        ...history.map(m => ({ text: `${m.role === 'user' ? 'Researcher' : persona.name}: ${m.content}` })),
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Persona Chat Error:", error);
    if (error.message?.includes("quota") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429) {
      throw new Error("API Quota Exceeded: The persona is currently unavailable. Please try again later.");
    }
    throw error;
  }
}

export async function mentorRigorCheck(phase: string, data: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `You are the UX Methods Mentor. Evaluate the user's affinity map in the ${phase} phase.
      Data: ${JSON.stringify(data)}.
      
      Evaluate the map using the following schema for four categories:
      1. Data Utilization: Ensure both qualitative and quantitative data are used effectively.
      2. Thematic Quality: Ensure themes are meaningful, distinct, and grounded in data.
      3. System Alignment: Ensure the synthesis aligns with research goals and systemic constraints.
      4. Bias: Check for leading themes or biased interpretations.
      
      Also, identify any key insights from the raw data that are NOT currently represented in the user's affinity map.
      
      Return a JSON object: { 
        data_utilization: { passed: boolean, feedback_string: string },
        thematic_quality: { passed: boolean, feedback_string: string },
        system_alignment: { passed: boolean, feedback_string: string },
        bias: { passed: boolean, feedback_string: string },
        passed: boolean, // true only if all categories pass
        revealedInsights: [{ content: string, type: 'qualitative' | 'quantitative' }] // only insights NOT already in the user's map
      }.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return JSON.parse(response.text || '{"passed": false, "feedback": "Error checking rigor."}');
  } catch (error: any) {
    console.error("Mentor Rigor Check Error:", error);
    if (error.message?.includes("quota") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429) {
      throw new Error("API Quota Exceeded: The mentor is currently busy. Please try again in a few minutes.");
    }
    throw error;
  }
}

export async function generateInitialInsights(csvData: any[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Analyze this raw UX research data: ${JSON.stringify(csvData.slice(0, 100))}.
      Generate 20-25 broad, summarized stickies that clump ideas together from the survey responses.
      CRITICAL: Include hard statistics (e.g., percentages, counts) where applicable to ground the insights in data.
      These should be high-level summaries of common sentiments or data points, not deep insights yet.
      Return a JSON array of objects with: content (the summary), type ('qualitative' or 'quantitative').`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error: any) {
    console.error("Initial Insights Error:", error);
    if (error.message?.includes("quota") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429) {
      throw new Error("API Quota Exceeded: Could not generate initial insights. Showing raw data instead.");
    }
    throw error;
  }
}

export async function scanForBias(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Scan this UX test task for leading questions or bias: "${text}". 
      Return a JSON object: { biased: boolean, suggestions: string[] }.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return JSON.parse(response.text || '{"biased": false, "suggestions": []}');
  } catch (error: any) {
    console.error("Bias Scan Error:", error);
    if (error.message?.includes("quota") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429) {
      return { biased: false, suggestions: ["(Bias scan unavailable due to API quota)"] };
    }
    throw error;
  }
}

export async function simulateTestResults(testPlan: any, personas: any[], concept: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Simulate usability test results for this plan: ${JSON.stringify(testPlan)}. 
      The personas are: ${JSON.stringify(personas)}. 
      The concept is: "${concept}". 
      Provide a realistic report on how these personas would likely execute the tasks and what friction points they would encounter.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Simulation Error:", error);
    if (error.message?.includes("quota") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429) {
      throw new Error("API Quota Exceeded: Could not run simulation. Please try again later.");
    }
    throw error;
  }
}
