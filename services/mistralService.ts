import { handleApiError } from './geminiService';

/**
 * Calls the Mistral API for a chat completion and streams the response.
 * @param query The user's query.
 * @param chatHistory The previous messages in the conversation.
 * @returns An async generator that yields the text content of each chunk.
 */
export async function* callMistral(
    query: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
): AsyncGenerator<{ text: string }> {
    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'mistral-large-latest',
                messages: [
                    ...chatHistory,
                    {
                        role: 'user',
                        content: query,
                    },
                ],
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to get response reader");
        }
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6);
                    if (dataStr.trim() === '[DONE]') {
                        return;
                    }
                    try {
                        const chunk = JSON.parse(dataStr);
                        const text = chunk.choices[0]?.delta?.content;
                        if (text) {
                            yield { text };
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk:', e, 'Chunk:', dataStr);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Mistral API Error:", error);
        throw handleApiError(error);
    }
}