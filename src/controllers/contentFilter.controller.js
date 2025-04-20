import { gemini20FlashExp } from '@genkit-ai/googleai';
import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

export const ai = genkit({
    plugins: [googleAI({
        apiKey: process.env.GOOGLE_API_KEY,
    })],
    model: gemini20FlashExp,
});


export const filterContent = async (req, reply) => {
    try {
        const { content } = req.body;

        if (!content) {
            return reply.status(400).send({ error: 'Text content is required.' });
        }

        const { output } = await ai.generate({
            system: `You are an expert content moderation assistant. Your task is to evaluate the suitability of text content for a public forum. Consider factors such as profanity, hate speech, insults, threats,trolling, sexually suggestive language, and overall tone. Provide a score between 0 and 1, where 0 indicates the content is highly inappropriate and scrore more than 0.6 indicates it is suitable to post and 1 indicates it is perfectly acceptable.
            strictly give the output in json format only like this example
           {
            "score": 0.75,
            "allowed": true, // true if score > 0.6, false otherwise
                }
            `,
            prompt: ` Text: ${content}`,
        });
        reply.send({ output });
    } catch (error) {
        console.error('Error filtering content:', error);
        reply.status(500).send({ error: 'Failed to filter content.' });
    }
};