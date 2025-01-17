// import { pipeline } from '@xenova/transformers';

// // Function to generate embeddings for a given data source
// export async function getEmbedding(data) {
//     const embedder = await pipeline(
//         'feature-extraction', 
//         'Xenova/nomic-embed-text-v1');
//     const results = await embedder(data, { pooling: 'mean', normalize: true });
//     return Array.from(results.data);
// }


import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

export async function getEmbedding(data) {
    try {
        const result = await model.embedContent(data);
        return result.embedding.values;
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("API Response Error:", error.response.data);
        }
    }
}