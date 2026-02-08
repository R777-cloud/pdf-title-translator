import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set");
}

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const getModel = () => {
  const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-1.5-pro";
  return genAI.getGenerativeModel({ model: modelName });
};
