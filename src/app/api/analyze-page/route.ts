import { NextRequest, NextResponse } from "next/server";
import { getModel, genAI } from "@/lib/gemini";

// Set max duration to 60 seconds (max for Hobby plan)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image, task = "translate" } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Remove data:image/jpeg;base64, prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    const today = new Date().toLocaleDateString("zh-CN", { year: 'numeric', month: 'long', day: 'numeric' });

    const PROMPTS = {
      translate: `
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
`,
      proofread: `
Role： 你是一位极其严谨的文字编辑，精通中文和英文的语言规范及百科通识。你的任务是审查用户输入内容中的文本信息，找出其中的错误并提供修改建议。

Context Info:
Current Date: ${today} (所有时间逻辑判断必须以此日期为基准，2025年及之前均为过去或当前时间，绝非未来！)

任务： 请检查当前提供的图片内容，识别中英文错别字、拼写错误及逻辑错误。

Strict Constraints:
1. 忽略专业术语、行业黑话、营销口号（如“破圈”、“赋能”、“超级增程”等均不算错）。
2. **严禁修改正确的时间年份**。除非年份格式有误，否则不要因为你的训练数据过时而认为未来的年份是错的。
3. **进行图文一致性检查，但必须极其保守**。
   - 仅当图片内容与文字描述存在**根本性、无可争议的冲突**时才报错（例如：图片是一只猫，文字却写“这是一只狗”）。
   - **严禁**对车型分类、产品型号等专业领域进行主观臆断。如果你不能 100% 确定图片中的具体车型，就不要纠正车型描述（例如：不要轻易将“轿车”纠正为“MPV”，除非你确信那是一辆大巴车）。
   - 如果存在任何模糊或不确定，默认文字是正确的。
4. 仅输出确定的错误。

Output format:
Strictly return a valid JSON array of objects. Do not wrap in markdown code blocks.
Fields:
- "context": "错误词" (The part with error)
- "correction": "正确词" (The corrected content)
- "explanation": Leave empty string "" or brief type like "错别字".

If no errors are found (corresponding to "无"), return empty array [].

Example:
Input: "人工智障"
Output: [{"context": "人工智障", "correction": "人工智能", "explanation": "错别字"}]
`
    };

    const prompt = PROMPTS[task as keyof typeof PROMPTS] || PROMPTS.translate;

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
      
      // Normalize keys to lowercase to ensure frontend compatibility
      if (Array.isArray(data)) {
        data = data.map((item: any) => {
          const newItem: any = {};
          Object.keys(item).forEach(key => {
            newItem[key.toLowerCase()] = item[key];
          });
          return newItem;
        });
      }
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
