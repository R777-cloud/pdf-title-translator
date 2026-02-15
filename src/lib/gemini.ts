import { GoogleGenerativeAI } from "@google/generative-ai";

const getClient = (apiKey?: string, accessCode?: string) => {
  const serverAccessCode = process.env.TEAM_ACCESS_CODE;

  // 1. If user input matches the Team Access Code, use the SERVER'S default API Key.
  if (serverAccessCode && apiKey === serverAccessCode) {
    const defaultKey = process.env.GOOGLE_API_KEY;
    if (!defaultKey) {
      throw new Error("Server configuration error: GOOGLE_API_KEY is not set.");
    }
    return new GoogleGenerativeAI(defaultKey);
  }

  // 2. If user provided a specific API Key (and it's NOT the access code), use it.
  if (apiKey) {
    // Validate format to prevent using a wrong password as an API key
    if (!apiKey.startsWith("AIza")) {
      throw new Error("Invalid Access Code (or invalid API Key format). Did you forget to Redeploy after setting the code?");
    }
    return new GoogleGenerativeAI(apiKey);
  }

  // 3. Fallback: If no team code is configured on server (dev mode or public),
  // AND no code/key provided by user, allow default key (backward compatibility).
  if (process.env.GOOGLE_API_KEY && !serverAccessCode) {
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
