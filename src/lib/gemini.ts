import { GoogleGenerativeAI } from "@google/generative-ai";

const getClient = (apiKey?: string) => {
  const key = apiKey || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error("Google API Key is missing. Please set it in settings or environment variables.");
  }
  return new GoogleGenerativeAI(key);
};

// Legacy export, might be null if env is not set
export const genAI = process.env.GOOGLE_API_KEY 
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) 
  : {
      getGenerativeModel: () => { throw new Error("API Key not set"); }
    } as unknown as GoogleGenerativeAI;

export const getModel = (apiKey?: string) => {
  const client = getClient(apiKey);
  const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-1.5-pro";
  return client.getGenerativeModel({ model: modelName });
};

export const getFallbackModel = (apiKey?: string) => {
  const client = getClient(apiKey);
  return client.getGenerativeModel({ model: "gemini-1.5-pro" });
};
