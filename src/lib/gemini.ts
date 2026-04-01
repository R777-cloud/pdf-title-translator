import { GoogleGenerativeAI } from "@google/generative-ai";

type ContentPart = string | { inlineData?: { data: string; mimeType: string }; text?: string };

const isOpenAICompatible = (apiKey?: string) => apiKey?.startsWith("sk-") ?? false;

const getResolvedApiKey = (apiKey?: string, accessCode?: string) => {
  const serverAccessCode = process.env.TEAM_ACCESS_CODE;
  const envKey = process.env.GOOGLE_API_KEY;
  const customBaseUrl = process.env.GOOGLE_API_BASE_URL;

  if (serverAccessCode && apiKey === serverAccessCode) {
    if (!envKey) {
      throw new Error("Server configuration error: GOOGLE_API_KEY is not set.");
    }
    return envKey;
  }

  if (apiKey) {
    const cleanKey = apiKey.trim();
    if (customBaseUrl) {
      return cleanKey;
    }
    if (!cleanKey.startsWith("AIza")) {
      throw new Error("Invalid Access Code (or invalid API Key format). Please double-check your code.");
    }
    return cleanKey;
  }

  if (!serverAccessCode) {
    if (!envKey) {
      throw new Error("Server configuration error: GOOGLE_API_KEY is not set.");
    }
    return envKey;
  }

  throw new Error("Access Denied. Please provide a valid API Key or Team Access Code.");
};

const toParts = (content: ContentPart[]) =>
  content.map((part) => (typeof part === "string" ? { text: part } : part));

const toOpenAIContent = (content: ContentPart[]) =>
  content.flatMap((part): any[] => {
    if (typeof part === "string") {
      return [{ type: "text", text: part }];
    }

    if (part.text) {
      return [{ type: "text", text: part.text }];
    }

    if (part.inlineData) {
      return [
        {
          type: "image_url",
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          },
        },
      ];
    }

    return [];
  });

const getCustomClient = (apiKey?: string, accessCode?: string) => {
  const baseUrl = process.env.GOOGLE_API_BASE_URL?.replace(/\/$/, "");
  const resolvedApiKey = getResolvedApiKey(apiKey, accessCode);
  const protocol = process.env.GOOGLE_API_PROTOCOL || "gemini";

  if (!baseUrl) {
    return null;
  }

  if (protocol === "openai") {
    return {
      getGenerativeModel: ({ model }: { model: string }) => ({
        generateContent: async (content: ContentPart[]) => {
          const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resolvedApiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: toOpenAIContent(content),
                },
              ],
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Custom API request failed: ${response.status} ${response.statusText} ${text}`.trim());
          }

          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content || "";

          return {
            response: {
              text: () => text,
            },
          };
        },
      }),
    };
  }

  return {
    getGenerativeModel: ({ model }: { model: string }) => ({
      generateContent: async (content: ContentPart[]) => {
        const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resolvedApiKey}`,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: toParts(content),
              },
            ],
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Custom API request failed: ${response.status} ${response.statusText} ${text}`.trim());
        }

        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text || "")
            .join("") || "";

        return {
          response: {
            text: () => text,
          },
        };
      },
    }),
  };
};

const getGoogleClient = (apiKey?: string, accessCode?: string) => {
  const resolvedApiKey = getResolvedApiKey(apiKey, accessCode);
  return new GoogleGenerativeAI(resolvedApiKey);
};

const getClient = (apiKey?: string, accessCode?: string) => {
  return getCustomClient(apiKey, accessCode) || getGoogleClient(apiKey, accessCode);
};

const getDefaultVisionModelName = () => {
  if (process.env.GOOGLE_VISION_MODEL_NAME) {
    return process.env.GOOGLE_VISION_MODEL_NAME;
  }

  // Always respect the explicitly configured model name first.
  if (process.env.GOOGLE_MODEL_NAME) {
    return process.env.GOOGLE_MODEL_NAME;
  }

  if (process.env.GOOGLE_API_BASE_URL) {
    return "gemini-3.1-pro-preview";
  }

  return "gemini-3.1-pro-preview";
};

export const getModel = (apiKey?: string, accessCode?: string) => {
  const client = getClient(apiKey, accessCode);
  const modelName = getDefaultVisionModelName();
  return client.getGenerativeModel({ model: modelName });
};

export const getFallbackModel = (apiKey?: string, accessCode?: string) => {
  const client = getClient(apiKey, accessCode);
  return client.getGenerativeModel({ model: getDefaultVisionModelName() });
};

export const getVisionFallbackModel = (apiKey?: string, accessCode?: string) => {
  const client = getClient(apiKey, accessCode);
  return client.getGenerativeModel({ model: getDefaultVisionModelName() });
};
