import { NextRequest, NextResponse } from "next/server";
import { getModel, genAI } from "@/lib/gemini";

// Set max duration to 60 seconds (max for Hobby plan)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Remove data:image/jpeg;base64, prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
Role:
你是一位精通视觉分析、中文文案润色及英文母语水平的翻译专家。请分析上传的图片，识别并翻译其中的所有标题。

翻译策略：
长标题（超过2行）： 先提炼核心含义，再进行高度凝练的专业翻译。
短标题（2行以内）： 直接进行专业翻译，确保符合母语表达习惯。
图片左上角或右上角的Logo无需翻译。

Output format:
Strictly return a valid JSON array of objects. Do not wrap in markdown code blocks.
Example: [{"original": "中文标题", "translated": "English Title"}]
If no titles are found, return empty array [].
`;

    const contentPart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    };

    let result;
    try {
      const model = getModel();
      result = await model.generateContent([prompt, contentPart]);
    } catch (primaryError: any) {
      console.warn("Primary model failed, retrying with fallback model...", primaryError.message);
      
      // If primary model fails, try fallback strictly to gemini-1.5-pro
      if (process.env.GOOGLE_MODEL_NAME !== "gemini-1.5-pro") {
        try {
          const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
          result = await fallbackModel.generateContent([prompt, contentPart]);
        } catch (fallbackError: any) {
          throw new Error(`Primary and fallback models failed. Primary: ${primaryError.message}. Fallback: ${fallbackError.message}`);
        }
      } else {
        throw primaryError;
      }
    }

    const response = await result.response;
    const text = response.text();

    // Clean up markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error processing page:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
