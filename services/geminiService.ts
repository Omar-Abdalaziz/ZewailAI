import { GoogleGenAI, Chat, Part, Type } from "@google/genai";
import { Personalization, UserMemory } from '../types';
import { chatSystemInstruction, deepResearchChatSystemInstruction, buildSystemInstruction } from './systemInstructions';
import { supabase } from '../lib/supabaseClient';

// Initialize the Gemini AI client
// IMPORTANT: Assumes process.env.API_KEY is set in the environment.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const handleApiError = (error: unknown): Error => {
    console.error("API Error:", error);
    let userFriendlyMessage = "An unexpected error occurred while communicating with the AI. Please try again.";

    if (error instanceof Error && error.message) {
        try {
            // Attempt to parse Gemini-specific error format
            const errorDetails = JSON.parse(error.message);
            if (errorDetails?.error?.status === 'RESOURCE_EXHAUSTED') {
                userFriendlyMessage = "API quota exceeded. You've made too many requests recently. Please wait a moment or check your plan and billing details.";
            } else if (errorDetails?.error?.message) {
                userFriendlyMessage = errorDetails.error.message;
            } else {
                userFriendlyMessage = error.message;
            }
        } catch (parseError) {
            // Fallback for non-JSON or other error messages
            userFriendlyMessage = error.message;
        }
    }
    return new Error(userFriendlyMessage);
};

/**
 * Creates a new chat session initialized with a previous search context.
 * @param initialHistory - The initial messages to start the chat with.
 * @param isDeepResearch - Flag to determine which system instruction to use for the chat.
 * @param personalization - Optional user personalization settings.
 * @param memories - Optional array of user memories.
 * @returns A Chat instance.
 */
export const startChat = (
    initialHistory: { role: 'user' | 'model'; parts: Part[] }[], 
    isDeepResearch?: boolean,
    personalization?: Personalization,
    memories?: UserMemory[]
): Chat => {
  const baseSystemInstructionToUse = isDeepResearch ? deepResearchChatSystemInstruction : chatSystemInstruction;
  const systemInstruction = buildSystemInstruction(baseSystemInstructionToUse, personalization, memories);
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: initialHistory,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: systemInstruction,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return chat;
};

/**
 * Generates a concise title for a chat conversation.
 * @param initialQuery The user's first message in the chat.
 * @returns A promise that resolves to a short title string.
 */
export const generateChatTitle = async (initialQuery: string): Promise<string> => {
    if (!initialQuery) return "New Chat";
    try {
        const prompt = `Create a very short, concise title (5 words or less) for a conversation that starts with this user query: "${initialQuery}"`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              systemInstruction: "You are a title generation assistant. Your only output should be the raw text of the title. Do not add any prefixes, quotes, or explanations.",
              thinkingConfig: { thinkingBudget: 0 },
            }
        });

        const title = response.text.trim().replace(/["']/g, ""); // Remove quotes
        return title || initialQuery.substring(0, 40) + '...';

    } catch (error) {
        console.error("Error generating chat title:", error);
        // Fallback to a truncated version of the query on error
        return initialQuery.substring(0, 40) + '...';
    }
};

/**
 * Generates a concise summary for a workspace based on its chat history.
 * @param chats An array of chat objects containing queries and answers.
 * @returns A promise that resolves to a short summary string.
 */
export const generateWorkspaceSummary = async (chats: { query: string, answer: string }[]): Promise<string> => {
    if (chats.length === 0) return "";
    
    const context = chats
        .slice(0, 5) // Use the 5 most recent chats for context
        .map(chat => `Q: ${chat.query}\nA: ${chat.answer.substring(0, 200)}...`)
        .join('\n\n---\n\n');

    try {
        const prompt = `Based on the following chat excerpts, generate a very concise, one-sentence summary of the main topic or theme.
        
Context:
---
${context}
---
`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              systemInstruction: "You are a summarization assistant. Your only output should be the raw text of the summary. Do not add any prefixes, quotes, or explanations. Keep it to a single sentence.",
              thinkingConfig: { thinkingBudget: 0 },
            }
        });

        const summary = response.text.trim();
        return summary;
    } catch (error) {
        console.error("Error generating workspace summary:", error);
        throw new Error("Could not generate summary.");
    }
};

/**
 * Analyzes a conversation snippet to extract, update, or delete facts about the user.
 * @param userId - The ID of the current user.
 * @param userQuery - The user's message that prompted the response.
 * @param modelResponse - The AI's response being analyzed.
 * @param event - The trigger for this analysis ('conversation_end', 'liked_response', 'disliked_response').
 */
export const extractAndSaveUserMemories = async (
    userId: string,
    userQuery: string,
    modelResponse: string,
    event: 'conversation_end' | 'liked_response' | 'disliked_response'
): Promise<void> => {
    try {
        // 1. Fetch existing memories for context
        const { data: existingMemories, error: fetchError } = await supabase
            .from('user_memories')
            .select('id, content')
            .eq('user_id', userId);

        if (fetchError) {
            console.error("Error fetching existing memories:", fetchError);
            return;
        }

        const existingMemoriesContent = existingMemories?.map(m => m.content) || [];

        // 2. Determine the AI's goal based on the event
        let eventDescription = '';
        switch (event) {
            case 'liked_response':
                eventDescription = "The user explicitly LIKED the AI's response. Your goal is to infer an IMPLICIT PREFERENCE about the response's style, format, or content (e.g., 'User appreciates code examples', 'User prefers concise answers'). Focus on adding one high-quality new memory. Do not update or delete unless the positive feedback directly contradicts an old memory.";
                break;
            case 'disliked_response':
                eventDescription = "The user explicitly DISLIKED the AI's response. Your goal is to infer what was wrong and create a CORRECTIVE memory (e.g., 'User dislikes informal language', 'User finds long paragraphs hard to read'). This is a strong signal to CORRECT or DELETE an existing memory that may have led to the poor response.";
                break;
            case 'conversation_end':
            default:
                eventDescription = "This is a standard post-conversation analysis. Your goal is to extract EXPLICIT FACTS the user has stated about THEMSELVES (e.g., 'I am a doctor', 'My favorite programming language is Rust'). Do not extract general information from the conversation topic. Prioritize updating existing memories with new details over creating new ones.";
                break;
        }

        // 3. Create the prompt for the AI
        const prompt = `Your task is to intelligently manage a list of facts (memories) about a user based on a specific event.
**Event & Your Goal:** ${eventDescription}

**Core Rules:**
1.  **CRITICAL SCOPE RULE:** The facts you save MUST be about the user themselves. This includes their personal details (profession, hobbies), their preferences (likes/dislikes, communication style), or their behavior. **DO NOT** save general knowledge or facts about the topics, people, or entities the user is asking about. For example, if the user asks 'What is the capital of France?', DO NOT save 'The capital of France is Paris'. Instead, you could infer 'User is interested in geography' if a pattern emerges.
2.  **PRIORITIZE UPDATING:** Before adding a new memory, always check if the information is an elaboration or correction of an existing memory. If so, you MUST use the "updated" field.
3.  **NO DUPLICATES:** Do not add a new memory if it's a slight variation of an existing one. Update the existing one.
4.  **EXACT MATCHING:** When updating or deleting, the "old" value or the string in the "deleted" array MUST be an EXACT, character-for-character match from the "Existing Memories" list.

**Existing Memories:**
${existingMemoriesContent.length > 0 ? JSON.stringify(existingMemoriesContent) : "[]"}

**Conversation Snippet:**
User: "${userQuery}"
AI: "${modelResponse}"

**Your Task:**
Return a JSON object with three keys: "new", "updated", and "deleted".

- **"new" (Array of strings):** For completely new facts *about the user*.
- **"updated" (Array of objects):** Each object has "old" (the exact existing memory) and "new" (the improved memory).
- **"deleted" (Array of strings):** For obsolete or contradicted memories *about the user*.

If no relevant user facts are found, return \`{ "new": [], "updated": [], "deleted": [] }\`.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                new: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Brand new facts about the user."
                },
                updated: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            old: { type: Type.STRING, description: "The exact content of the memory to be updated." },
                            new: { type: Type.STRING, description: "The new, updated content for the memory." }
                        },
                        required: ['old', 'new']
                    },
                    description: "Facts that need to be updated with new information."
                },
                deleted: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Facts that are no longer true or relevant."
                }
            },
            required: ['new', 'updated', 'deleted']
        };
        
        // 4. Call the AI with the new prompt and schema
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are an intelligent user memory management assistant. Your only output must be a single, valid JSON object conforming to the schema, with no other text, markdown, or explanations.",
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        const jsonText = response.text.trim();
        const { new: newFacts, updated: updatedFacts, deleted: deletedFacts } = JSON.parse(jsonText) as {
            new: string[];
            updated: { old: string; new: string }[];
            deleted: string[];
        };

        const dbPromises: Promise<any>[] = [];

        // 5. Process the AI's response and prepare DB operations

        // Insert new facts
        if (newFacts?.length > 0) {
            const memoriesToInsert = newFacts.map(fact => ({
                user_id: userId,
                content: fact,
            }));
            dbPromises.push(Promise.resolve(supabase.from('user_memories').insert(memoriesToInsert)));
        }

        // Update existing facts
        if (updatedFacts?.length > 0 && existingMemories) {
            for (const update of updatedFacts) {
                const memoryToUpdate = existingMemories.find(m => m.content === update.old);
                if (memoryToUpdate) {
                    dbPromises.push(
                        Promise.resolve(supabase
                            .from('user_memories')
                            .update({ content: update.new })
                            .eq('id', memoryToUpdate.id))
                    );
                }
            }
        }

        // Delete obsolete facts
        if (deletedFacts?.length > 0 && existingMemories) {
            const idsToDelete = existingMemories
                .filter(m => deletedFacts.includes(m.content))
                .map(m => m.id);
            
            if (idsToDelete.length > 0) {
                dbPromises.push(
                    Promise.resolve(supabase
                        .from('user_memories')
                        .delete()
                        .in('id', idsToDelete))
                );
            }
        }

        if (dbPromises.length === 0) {
            return; // No changes to make
        }

        // 6. Execute all database operations
        const results = await Promise.all(dbPromises);
        results.forEach(result => {
            if (result.error) {
                console.error("Error during memory database operation:", result.error);
            }
        });

    } catch (error) {
        // This is a background task, so just log the error without disturbing the user.
        console.error("Error extracting or saving user memories:", error);
    }
};