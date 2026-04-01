import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const geminiModel = ai.models.get({ model: "gemini-3.1-pro-preview" });

export async function generatePersonas(clusters: string[], existingNames: string[] = []) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Based on these UX research clusters: ${clusters.join(", ")}, generate 2-3 distinct user personas.
    CRITICAL: Every persona MUST have a unique first name AND a unique last name. No two personas should share a first name or a last name.
    ${existingNames.length > 0 ? `These names are already taken and MUST NOT be reused (not even the first or last name): ${existingNames.join(", ")}.` : ""}
    Return a JSON array of objects with: name (full name with first and last), role, frustrations (array), goals (array), bio.`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function personaChat(persona: any, conceptsSummary: string, history: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      { text: `You are ${persona.name}, a ${persona.role}. Your frustrations are: ${persona.frustrations.join(", ")}. Your goals are: ${persona.goals.join(", ")}.

      The researcher has the following concept ideas (each has a name you can reference):
      ${conceptsSummary}

      When the researcher mentions a concept by name, respond specifically about that concept.
      Respond as this persona, pushing back based on your systemic constraints and frustrations. Be critical but constructive. If the researcher asks you to compare concepts, give your honest preference and explain why.` },
      ...history.map(m => ({ text: `${m.role === 'user' ? 'Researcher' : persona.name}: ${m.content}` })),
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return response.text;
}

export async function mentorRigorCheck(phase: string, data: any) {
  const isGenerative = phase === 'generative';

  const exploratoryPrompt = `You are the UX Methods Mentor. Evaluate the user's affinity map in the exploratory phase.
    Data: ${JSON.stringify(data)}.

    Evaluate the map using the following schema for four categories:
    1. Data Utilization: Ensure both qualitative and quantitative data are used effectively.
    2. Thematic Quality: Ensure themes are meaningful, distinct, and grounded in data.
    3. System Alignment: Ensure the synthesis aligns with research goals and systemic constraints.
    4. Bias: Check for leading themes or biased interpretations.

    Also, identify any key insights from the raw data that are NOT currently represented in the user's affinity map.

    Finally, based on the knowledge gaps you identified, suggest 2-4 specific FOLLOW-UP STUDIES the researcher should conduct. These should be appropriate for the exploratory phase — e.g., contextual inquiries, diary studies, follow-up interviews, survey expansions, observational studies, card sorting, etc. Each suggestion should:
    - Name the specific method
    - Explain what knowledge gap it would fill
    - Describe who to recruit and what to focus on

    Return a JSON object: {
      data_utilization: { passed: boolean, feedback_string: string },
      thematic_quality: { passed: boolean, feedback_string: string },
      system_alignment: { passed: boolean, feedback_string: string },
      bias: { passed: boolean, feedback_string: string },
      passed: boolean,
      revealedInsights: [{ content: string, type: 'qualitative' | 'quantitative' }],
      followUpStudies: [{ method: string, gap: string, description: string }]
    }.`;

  const generativePrompt = `You are the UX Methods Mentor. Evaluate the user's concept ideation work in the generative phase.
    Data: ${JSON.stringify(data)}.

    The user has created and ranked concept ideas based on persona conversations. Evaluate using four categories:
    1. Data Utilization: Do the concepts address real user needs from the research themes and persona insights? Are the ranked concepts grounded in data, not assumptions?
    2. Thematic Quality: Are the concepts meaningfully distinct from each other? Does the ranking reflect a thoughtful evaluation rather than arbitrary ordering?
    3. System Alignment: Does the top-ranked concept align with identified user goals, frustrations, and systemic constraints from the personas?
    4. Bias: Are there blind spots? Does the ranking over-index on one persona's needs while ignoring others? Are any concepts based on designer assumptions rather than data?

    Also, suggest 1-3 NEW concept ideas the user hasn't considered, based on gaps you see between their themes/personas and current concepts.

    Finally, based on the knowledge gaps you identified in the concept work, suggest 2-4 specific FOLLOW-UP STUDIES the researcher should conduct. These should be appropriate for the generative phase — e.g., co-design workshops, concept testing, participatory design sessions, A/B preference tests, storyboard walkthroughs, speed dating (design), Wizard of Oz prototyping, etc. Each suggestion should:
    - Name the specific method
    - Explain what knowledge gap or concept uncertainty it would resolve
    - Describe who to recruit and what to focus on

    Return a JSON object: {
      data_utilization: { passed: boolean, feedback_string: string },
      thematic_quality: { passed: boolean, feedback_string: string },
      system_alignment: { passed: boolean, feedback_string: string },
      bias: { passed: boolean, feedback_string: string },
      passed: boolean,
      revealedInsights: [{ content: string, type: 'qualitative' }],
      followUpStudies: [{ method: string, gap: string, description: string }]
    }.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: isGenerative ? generativePrompt : exploratoryPrompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return JSON.parse(response.text || '{"passed": false, "feedback": "Error checking rigor."}');
}

export async function generateInitialInsights(csvData: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a UX research analyst. Analyze this raw survey data: ${JSON.stringify(csvData.slice(0, 100))}.

    Your job is to surface PRELIMINARY INSIGHTS — not raw responses — that will help a researcher build an affinity map.

    Guidelines:
    1. Identify recurring PATTERNS, TENSIONS, and THEMES across multiple responses. Each sticky should synthesize signal from several data points, not echo a single respondent.
    2. For quantitative insights: include hard statistics (e.g., "72% of respondents rated X below 3", "Average satisfaction score: 2.4/5") computed from the data.
    3. For qualitative insights: distill a common sentiment, pain point, unmet need, or behavioral pattern (e.g., "Users repeatedly describe onboarding as 'overwhelming' — 8 of 15 mention information overload in their first session").
    4. Surface CONTRADICTIONS or TENSIONS in the data (e.g., "Users say they want simplicity but also request more features").
    5. Flag OUTLIER perspectives that challenge the majority view — these are often the most valuable for design.
    6. Write each insight as a concise, action-oriented observation that naturally suggests which theme it might belong to.

    Generate 20-25 insights. Aim for roughly 60% qualitative, 40% quantitative.
    Return a JSON array of objects with: content (the insight), type ('qualitative' or 'quantitative').`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function suggestThemeNames(stickies: { content: string; type: string }[], existingThemes: string[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a UX research analyst helping build an affinity map.

    Here are the current sticky note insights on the board:
    ${stickies.map(s => `- [${s.type}] ${s.content}`).join("\n")}

    ${existingThemes.length > 0 ? `Existing themes already created: ${existingThemes.join(", ")}` : "No themes created yet."}

    Suggest 3-5 potential theme names that would meaningfully group these insights.
    - Each theme should represent a distinct, actionable research finding area.
    - Avoid generic names like "User Feedback" — be specific (e.g., "Onboarding Friction", "Trust & Transparency Gaps").
    - Do NOT duplicate existing themes. Suggest themes that capture insights not yet covered.

    Return a JSON array of objects: [{ name: string, reason: string }] where reason is a 1-sentence explanation of what insights this theme would capture.`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function suggestStickyInsights(csvData: any[], existingStickies: string[], themes: string[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a UX research analyst. A researcher is building an affinity map and wants to add more insights.

    Raw survey data: ${JSON.stringify(csvData.slice(0, 100))}

    Insights already on the board:
    ${existingStickies.map(s => `- ${s}`).join("\n")}

    ${themes.length > 0 ? `Current themes: ${themes.join(", ")}` : "No themes yet."}

    Identify 3-5 GAPS — important insights from the data that are NOT yet represented on the board.
    Focus on patterns, pain points, or data points that the researcher may have missed.

    Return a JSON array of objects: [{ content: string, type: 'qualitative' | 'quantitative' }]`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function suggestConcepts(clusters: string[], personas: any[], existingConcepts: string[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a UX research analyst helping a designer ideate concepts.

    Research themes: ${clusters.join(", ")}

    Personas:
    ${personas.map(p => `- ${p.name} (${p.role}): Goals: ${p.goals.join(", ")}. Frustrations: ${p.frustrations.join(", ")}`).join("\n")}

    ${existingConcepts.length > 0 ? `Concepts already created:\n${existingConcepts.map(c => `- ${c}`).join("\n")}` : "No concepts created yet."}

    Suggest 3-5 NEW concept ideas that address unmet needs from the personas and themes. Each concept should:
    - Be specific and actionable (not generic)
    - Address a frustration or goal from at least one persona
    - Be distinct from existing concepts

    Return a JSON array of strings, where each string is a concept description.`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function scanForBias(text: string) {
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
}

export async function simulateTestResults(testPlan: any, personas: any[], concept: string) {
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
}

export async function personaEvaluateWebsite(persona: any, url: string, topConcept: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are ${persona.name}, a ${persona.role}.
    Your goals are: ${persona.goals.join(", ")}.
    Your frustrations are: ${persona.frustrations.join(", ")}.
    Bio: ${persona.bio}

    You are evaluating this website/prototype: ${url}
    ${topConcept ? `The design concept behind it: ${topConcept}` : ""}

    As this persona, evaluate the website using Nielsen's 10 Usability Heuristics. For each heuristic, give a score from 1-5 (1=terrible, 5=excellent) and a brief comment from your perspective.

    Also provide:
    - An overall satisfaction score (1-10) based on how well this site meets YOUR specific goals and avoids YOUR frustrations
    - A 2-3 sentence summary of your overall experience
    - Your top 3 usability issues (as this persona)
    - 2-3 things the site does well (from your perspective)

    The 10 heuristics:
    1. Visibility of System Status
    2. Match Between System and Real World
    3. User Control and Freedom
    4. Consistency and Standards
    5. Error Prevention
    6. Recognition Rather Than Recall
    7. Flexibility and Efficiency of Use
    8. Aesthetic and Minimalist Design
    9. Help Users Recognize, Diagnose, and Recover from Errors
    10. Help and Documentation

    Return a JSON object: {
      satisfactionScore: number (1-10),
      summary: string,
      heuristics: [{ name: string, score: number (1-5), comment: string }],
      topIssues: [string, string, string],
      positives: [string, string]
    }`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return JSON.parse(response.text || '{}');
}

export async function evalPersonaChat(persona: any, evaluation: any, url: string, history: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      { text: `You are ${persona.name}, a ${persona.role}. Your frustrations are: ${persona.frustrations.join(", ")}. Your goals are: ${persona.goals.join(", ")}.

      You just evaluated this website: ${url}
      Your satisfaction score was ${evaluation.satisfactionScore}/10.
      Your top issues were: ${evaluation.topIssues.join(", ")}
      Things you liked: ${evaluation.positives.join(", ")}
      Summary: ${evaluation.summary}

      A UX researcher is now interviewing you about your evaluation. Answer as this persona — be honest, specific, and grounded in your actual experience with the site. Reference specific parts of the interface when possible. If asked about tradeoffs, give your genuine preference based on your role and constraints.` },
      ...history.map(m => ({ text: `${m.role === 'user' ? 'Researcher' : persona.name}: ${m.content}` })),
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return response.text;
}
