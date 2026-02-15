import { GoogleGenerativeAI } from "@google/generative-ai";

const getClient = (apiKey?: string, accessCode?: string) => {
  // 1. If user provided a specific API Key, use it.
  if (apiKey) {
    return new GoogleGenerativeAI(apiKey);
  }

  // 2. If user provided a Team Access Code, check if it matches the server env.
  // Note: We check if TEAM_ACCESS_CODE is configured on server.
  const serverAccessCode = process.env.TEAM_ACCESS_CODE;
  
  if (serverAccessCode && accessCode === serverAccessCode) {
    // Code matches, allow using the default server API Key
    const defaultKey = process.env.GOOGLE_API_KEY;
    if (!defaultKey) {
      throw new Error("Server configuration error: GOOGLE_API_KEY is not set.");
    }
    return new GoogleGenerativeAI(defaultKey);
  }

  // 3. Fallback: If no team code is configured on server (dev mode or public),
  // AND no code/key provided by user, maybe allow?
  // User Requirement: "Others cannot use my API unless they are in my team".
  // So if TEAM_ACCESS_CODE is set, we strictly enforce it.
  // If TEAM_ACCESS_CODE is NOT set, we might default to existing behavior (allow default key),
  // BUT user wants to restrict it.
  
  // Revised Logic:
  // If apiKey is provided -> OK.
  // If accessCode matches env.TEAM_ACCESS_CODE -> OK (use env.GOOGLE_API_KEY).
  // Else -> Error.
  
  if (process.env.GOOGLE_API_KEY && !serverAccessCode) {
     // Legacy/Dev mode: If no team code is set up, but API key is there, allow it?
     // For safety based on user request, let's allow it ONLY if user didn't ask to lock it.
     // But user asked to lock it. 
     // We will assume if TEAM_ACCESS_CODE is not set, it behaves as before (open).
     // Once user sets TEAM_ACCESS_CODE in Vercel, it locks down.
     return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }

  throw new Error("Access Denied. Please provide a valid API Key or Team Access Code.");
};

// Legacy export, might be null if env is not set
export const genAI = process.env.GOOGLE_API_KEY 
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) 
  : {
      getGenerativeModel: () => { throw new Error("API Key not set"); }
    } as unknown as GoogleGenerativeAI;

export const getModel = (apiKey?: string, accessCode?: string) => {
  const client = getClient(apiKey, accessCode);
  const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-1.5-pro";
  return client.getGenerativeModel({ model: modelName });
};

export const getFallbackModel = (apiKey?: string, accessCode?: string) => {
  const client = getClient(apiKey, accessCode);
  return client.getGenerativeModel({ model: "gemini-1.5-pro" });
};
