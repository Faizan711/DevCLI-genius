import { GoogleGenerativeAI } from "@google/generative-ai";
import { algoliasearch } from "algoliasearch";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

// This is the main function for your API endpoint
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests are allowed" });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  try {
    // --- STEP 1: RETRIEVAL (The "Search") ---
    const { results } = await algoliaClient.search([
      {
        indexName: "devcli_commands1",
        query,
        params: { hitsPerPage: 5 },
      },
    ]);
    const hits = results[0].hits;

    // --- STEP 2:  The "Context" ---
    const context = hits
      .map(
        (hit) =>
          `Tool: ${hit.tool}\nDescription: ${
            hit.description
          }\nExamples: ${hit.examples
            .map((e) => `${e.description}: \`${e.command}\``)
            .join(", ")}`
      )
      .join("\n\n---\n\n");

    const prompt = `You are a command-line tool expert called DevCLI Genius. Based on the following context of command examples, answer the user's query. Provide a single command and a brief, one-sentence explanation. You must respond with only a valid JSON object with two keys: "command" and "explanation".

Context:
${context}

User Query: "${query}"`;

    // --- STEP 3: GENERATION (The "Model") ---
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });
    const generationResult = await model.generateContent(prompt);
    const responseText = generationResult.response.text();
    const startIndex = responseText.indexOf("{");
    const endIndex = responseText.lastIndexOf("}");
    const jsonString = responseText.substring(startIndex, endIndex + 1);

    const result = JSON.parse(jsonString);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error details:", error);
    res
      .status(500)
      .json({ message: "An error occurred processing your request." });
  }
}
