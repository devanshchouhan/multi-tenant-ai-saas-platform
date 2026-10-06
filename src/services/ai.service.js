const { GoogleGenAI } = require('@google/genai');

/**
 * Service to generate AI response using official Google GenAI SDK
 */
const generateGeminiResponse = async (historyMessages, latestUserText) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Gracefully handle missing or placeholder API keys
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('GEMINI_API_KEY is missing or unconfigured. Falling back to ticket escalation.');
      return { success: false, reason: 'MISSING_API_KEY' };
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format recent conversation history for context
    const promptHistory = historyMessages
      .map((msg) => `${msg.senderType === 'customer' ? 'Customer' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const systemInstruction = `You are a helpful customer support AI assistant for a multi-tenant support platform. Provide concise, professional, and helpful answers. If you do not know the answer, if the request requires human intervention, or if the user asks for a human agent, respond with exactly "ESCALATE_TO_HUMAN".`;

    const fullPrompt = `${systemInstruction}\n\nChat History:\n${promptHistory}\n\nCustomer: ${latestUserText}\nAssistant:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    const aiText = response.text ? response.text.trim() : '';

    if (!aiText || aiText.includes('ESCALATE_TO_HUMAN')) {
      return { success: false, reason: 'AI_CANNOT_ANSWER' };
    }

    return {
      success: true,
      text: aiText,
    };
  } catch (error) {
    console.error('Gemini API Exception:', error.message);
    return { success: false, reason: 'GEMINI_API_ERROR' };
  }
};

module.exports = {
  generateGeminiResponse,
};
