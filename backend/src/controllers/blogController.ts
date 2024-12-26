import { Request, Response } from 'express';
import OpenAI, { OpenAIError } from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

// Add debug logging for API key
console.log("OpenAI API Key first 4 chars:", process.env.OPENAI_API_KEY?.slice(0, 4));
console.log("OpenAI API Key length:", process.env.OPENAI_API_KEY?.length);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateSummary = async (req: Request, res: Response) => {
  try {
    // Add more debug logging
    console.log("OpenAI client configuration:", {
      hasApiKey: !!openai.apiKey,
      apiKeyLength: openai.apiKey?.length,
      firstFourChars: openai.apiKey?.slice(0, 4)
    });

    const { content } = req.body as { content: string };

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Log before making the API call
    console.log("Attempting OpenAI API call...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise summaries of blog posts. Keep summaries under 150 characters."
        },
        {
          role: "user",
          content: `Generate a brief summary of this blog post: ${content}`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    console.log("OpenAI API call response:", response);
    const summary = response.choices[0]?.message?.content || "No summary generated";
    return res.json({ summary });
  } catch (error: unknown) {
    // Enhanced error logging
    console.error('Error details:', {
      name: (error as OpenAIError).name,
      message: (error as OpenAIError).message,
    });
    return res.status(500).json({ error: 'Failed to generate summary', details: (error as OpenAIError).message });
  }
};
