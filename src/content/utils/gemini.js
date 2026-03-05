import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateResponse = async (apiKey, prompt, context = "", imageBase64 = null) => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

    let parts = [];
    
    // Add system context/instruction
    if (context) {
      parts.push({ text: `Context from webpage:\n${context}\n\n` });
    }

    // Add user prompt
    parts.push({ text: prompt });

    // Add image if present
    if (imageBase64) {
      // Remove header if present (data:image/jpeg;base64,)
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Error: ${error.message}`;
  }
};
