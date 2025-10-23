import { Part, Type, GenerateContentResponse } from "@google/genai";
import { ai, handleApiError } from './geminiService';
import { baseSystemInstruction, deepResearchSystemInstruction, buildSystemInstruction } from './systemInstructions';
import { FinanceData, Source, Citation, Personalization, ImageSearchResult, UserMemory, DeepResearchChunk } from '../types';

/**
 * Performs a smart search using the Gemini API with Google Search grounding, streaming the results.
 * @param query The user's search query.
 * @param file Optional file data for multimodal queries.
 * @param isDeepResearch Flag to enable academic, structured responses.
 * @param personalization Optional user personalization settings.
 * @param memories Optional array of user memories to personalize the response.
 * @returns An async generator that yields chunks of the response.
 * @throws An error with a user-friendly message if the search fails.
 */
export async function* performSmartSearch(
    query: string, 
    file?: { mimeType: string, data: string }, 
    isDeepResearch?: boolean,
    personalization?: Personalization,
    memories?: UserMemory[]
): AsyncGenerator<{ text?: string; sources?: Source[]; citations?: Citation[] }> {
  try {
    const contentParts: Part[] = [];
    if (file) {
      contentParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data,
        }
      });
    }
    contentParts.push({ text: query || 'Please describe the attached file.' });

    const baseInstruction = isDeepResearch ? deepResearchSystemInstruction : baseSystemInstruction;
    const systemInstruction = buildSystemInstruction(baseInstruction, personalization, memories);

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ parts: contentParts }],
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of responseStream) {
        const text = chunk.text;
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const citations = chunk.candidates?.[0]?.citationMetadata?.citations;
        
        const sources: Source[] | undefined = groundingChunks
            ?.map((c: any) => c.web)
            .filter((w: any) => w?.uri && w?.title)
            .map((w: any) => ({ title: w.title, uri: w.uri }));

        yield {
            text: text,
            sources: sources,
            citations: citations as Citation[] | undefined
        };
    }

  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Performs a multi-step, deep research process for complex queries.
 * This function simulates a "thinking" process by breaking down the task into stages.
 */
export async function* performDeepResearch(
    query: string,
    file?: { mimeType: string; data: string },
    personalization?: Personalization,
    memories?: UserMemory[]
): AsyncGenerator<DeepResearchChunk> {
    try {
        // Stage 1: Generate a research plan (sub-queries)
        yield { stage: 'PLANNING' };
        const planPrompt = `Based on the user's query, generate a research plan of 3 to 5 distinct, sequential, and detailed search queries that will collectively provide a comprehensive answer. The queries should cover different angles of the topic. User Query: "${query}"`;
        const planResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: planPrompt,
            config: {
                systemInstruction: "You are a research assistant. Your ONLY output must be a valid JSON array of strings, where each string is a search query. Example: [\"detailed query 1\", \"specific query 2\"]",
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        const subQueries = JSON.parse(planResponse.text) as string[];
        yield { stage: 'QUERIES', payload: subQueries };

        // Stage 2: Execute searches for each sub-query
        const allSources = new Map<string, Source>();
        const allSearchResults: GenerateContentResponse[] = [];
        for (let i = 0; i < subQueries.length; i++) {
            const subQuery = subQueries[i];
            yield { stage: 'SEARCHING', payload: { total: subQueries.length, complete: i + 1, query: subQuery } };
            const searchResult = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: subQuery,
                config: { tools: [{ googleSearch: {} }] }
            });
            allSearchResults.push(searchResult);

            const groundingChunks = searchResult.candidates?.[0]?.groundingMetadata?.groundingChunks;
            groundingChunks?.forEach((c: any) => {
                const web = c.web;
                if (web?.uri && web?.title) {
                    allSources.set(web.uri, { title: web.title, uri: web.uri });
                }
            });
        }

        // Stage 3: Analyze and Synthesize
        const sourceCount = allSources.size;
        yield { stage: 'ANALYZING', payload: sourceCount };
        
        const synthesisContext = allSearchResults.map((res, i) => `--- Search Result for query "${subQueries[i]}" ---\n${res.text}\n\n`).join('');
        const synthesisPrompt = `You are an expert research analyst. Your task is to synthesize the following search results into a single, comprehensive, well-structured, and cited answer to the user's original query.
Original User Query: "${query}"

--- BEGIN RESEARCH DATA ---
${synthesisContext}
--- END RESEARCH DATA ---

Provide your final answer below. You MUST cite information using the grounding tool, following all formatting and citation rules from your main system instructions.`;

        yield { stage: 'SYNTHESIZING' };
        const systemInstruction = buildSystemInstruction(deepResearchSystemInstruction, personalization, memories);
        const contentParts: Part[] = file ? [{ inlineData: { mimeType: file.mimeType, data: file.data } }, { text: synthesisPrompt }] : [{ text: synthesisPrompt }];

        const finalStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [{ parts: contentParts }],
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
            },
        });

        for await (const chunk of finalStream) {
            const text = chunk.text;
            const citations = chunk.candidates?.[0]?.citationMetadata?.citations;
            
            // The final stream might also have grounding chunks, merge them if they exist
            const chunkGrounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            chunkGrounding?.forEach((c: any) => {
                const web = c.web;
                if (web?.uri && web?.title) {
                    allSources.set(web.uri, { title: web.title, uri: web.uri });
                }
            });

            yield { stage: 'RESULT', payload: { text, sources: Array.from(allSources.values()), citations: citations as Citation[] | undefined } };
        }

    } catch (error) {
        throw handleApiError(error);
    }
}


/**
 * Fetches financial data using the Gemini API.
 * @returns A promise that resolves to a FinanceData object.
 * @throws An error with a user-friendly message if the fetch fails.
 */
export const fetchFinanceData = async (): Promise<FinanceData> => {
  const prompt = "Provide a comprehensive overview of the current financial market. Include major market indices (e.g., Dow Jones, S&P 500, NASDAQ) with their current values and changes. Give a brief market analysis summary. List the top 5 stock market gainers and top 5 losers for today, including their ticker, name, price, and percentage change. Finally, provide 4 recent, relevant financial news articles with titles, sources, URLs, and image URLs. Focus on US markets primarily.";

  const systemInstruction = `You are a financial data assistant. Your response MUST be a single, valid JSON object. Do not include any other text, markdown, or explanations. The JSON must conform to the provided schema. The 'isPositive' boolean for indices and stocks should be true for gains and false for losses. Ensure all string fields are populated and URLs are valid.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      marketIndices: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            value: { type: Type.STRING },
            change: { type: Type.STRING },
            percentChange: { type: Type.STRING },
            isPositive: { type: Type.BOOLEAN },
          },
          required: ['name', 'value', 'change', 'percentChange', 'isPositive'],
        },
      },
      marketAnalysis: {
        type: Type.STRING,
        description: "A concise summary of the current market sentiment and key events.",
      },
      topMovers: {
        type: Type.OBJECT,
        properties: {
          gainers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ticker: { type: Type.STRING },
                name: { type: Type.STRING },
                price: { type: Type.STRING },
                percentChange: { type: Type.STRING },
                isPositive: { type: Type.BOOLEAN, description: "Should always be true for gainers." },
              },
              required: ['ticker', 'name', 'price', 'percentChange', 'isPositive'],
            },
          },
          losers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ticker: { type: Type.STRING },
                name: { type: Type.STRING },
                price: { type: Type.STRING },
                percentChange: { type: Type.STRING },
                isPositive: { type: Type.BOOLEAN, description: "Should always be false for losers." },
              },
              required: ['ticker', 'name', 'price', 'percentChange', 'isPositive'],
            },
          },
        },
        required: ['gainers', 'losers'],
      },
      financialNews: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            source: { type: Type.STRING },
            url: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            publishedAt: { type: Type.STRING, description: "ISO 8601 date string." },
            summary: { type: Type.STRING }
          },
          required: ['title', 'source', 'url', 'imageUrl', 'publishedAt', 'summary'],
        },
      },
    },
    required: ['marketIndices', 'marketAnalysis', 'topMovers', 'financialNews'],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText) as FinanceData;
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Generates related search queries based on an initial query and its result.
 * @param originalQuery The user's initial search query.
 * @param searchResultText The text content of the initial search result.
 * @returns A promise that resolves to an array of related query strings.
 */
export const generateRelatedQueries = async (originalQuery: string, searchResultText: string): Promise<string[]> => {
  const prompt = `Based on the original search query "${originalQuery}" and the following search result text, generate 3 to 5 related search queries that the user might find helpful for further exploration. The queries should be distinct from the original query and each other.

Search Result Text:
---
${searchResultText.substring(0, 3000)}...
---`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful assistant that suggests related search queries. Your output MUST be a valid JSON array of strings. Do not include any other text, markdown, or explanations. For example: [\"What is the history of X?\", \"How does Y compare to Z?\"]",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    
    let jsonText = response.text.trim();
    
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = jsonText.match(jsonBlockRegex);
    if (match && match[1]) {
      jsonText = match[1].trim();
    }
    
    let queries = JSON.parse(jsonText) as string[];

    if (!Array.isArray(queries) || !queries.every(q => typeof q === 'string')) {
      throw new Error("AI returned data in an unexpected format.");
    }

    return [...new Set(queries)].slice(0, 5);

  } catch (error) {
    console.error("Error generating related queries:", error);
    // Return empty array on failure as this is a non-critical feature
    return [];
  }
};

/**
 * Fetches relevant images by analyzing the content of the provided source URLs.
 * @param query The user's text query to guide image relevance.
 * @param sources The list of source articles to analyze for images.
 * @returns A promise that resolves to an array of image search result objects.
 */
export const fetchImagesForSources = async (query: string, sources: Source[]): Promise<ImageSearchResult[]> => {
    if (!query.trim() || sources.length === 0) return [];

    const prompt = `Your task is to act as an image extractor. You will be given a user's query and a list of source article URLs that were used to answer that query. You MUST analyze the content of these specific URLs to find and extract relevant images.

User Query: "${query}"

Source URLs to analyze:
${sources.map(s => `- ${s.uri}`).join('\n')}

For each relevant image you find *within these pages*, provide a direct URL to the image file itself (e.g., ending in .jpg, .png, .webp), the URL of the source webpage (which will be one of the URLs from the list above), and a descriptive title.`;

    const systemInstruction = `You are an expert image extraction assistant. Your sole purpose is to return a valid, raw JSON array of image search results that are found *exclusively* within the provided source URLs. The entire response body MUST be ONLY the JSON array.
Each object in the array must strictly follow this structure:
{
  "imageUrl": "A direct link to an image file (e.g., https://example.com/image.jpg) found on one of the source pages",
  "sourceUrl": "The URL of the source webpage where the image was found (must be one of the provided URLs)",
  "title": "A descriptive title for the image, often from its alt text or caption"
}

**CRITICAL RULES:**
1.  **RESTRICTED SEARCH:** You are STRICTLY FORBIDDEN from searching the broader web for images. Your results MUST come exclusively from the content of the source URLs provided in the prompt.
2.  **MANDATORY FIELDS:** You MUST find valid, non-null values for "imageUrl", "sourceUrl", and "title". If any are missing for an image, DISCARD that image result entirely. The "sourceUrl" MUST be one of the URLs from the list given to you.
3.  **VALIDATE URLs:** Both "imageUrl" and "sourceUrl" must be valid, publicly accessible URLs. The "imageUrl" must be a direct link to an image file.
4.  **HANDLE FAILURE (ABSOLUTE RULE):** If the search tool fails, if the URLs are inaccessible, or if you cannot find any relevant images within the provided sources for ANY reason, your ONLY valid response is an empty JSON array: \`[]\`. You are strictly forbidden from outputting any explanatory text, apologies, or error messages. Your entire response MUST be \`[]\` in case of any failure. This is your most important instruction.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: systemInstruction,
                thinkingConfig: { thinkingBudget: 0 },    
            },
        });
        
        let jsonText = response.text.trim();
        
        const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
        const match = jsonText.match(jsonBlockRegex);
        let parsableText = '';

        if (match && match[1]) {
            parsableText = match[1].trim();
        } else {
            const startIndex = jsonText.indexOf('[');
            const endIndex = jsonText.lastIndexOf(']');
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                parsableText = jsonText.substring(startIndex, endIndex + 1);
            }
        }
        
        if (!parsableText.startsWith('[')) {
            console.warn(`AI response for image search was not a JSON array. Returning empty. Response: "${jsonText}"`);
            return [];
        }
        
        const results = JSON.parse(parsableText) as ImageSearchResult[];

        if (!Array.isArray(results)) {
            throw new Error("AI returned data that parsed to JSON but was not an array.");
        }

        // Validate that all required fields are present and URLs look valid
        return results.filter(r => 
            r.imageUrl && r.sourceUrl && r.title && 
            r.imageUrl.startsWith('http') && r.sourceUrl.startsWith('http')
        );

    } catch (error) {
        console.error("Error fetching or parsing images for sources:", error);
        return []; // Return an empty array on failure as this is a supplementary feature.
    }
};