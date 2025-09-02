
import { GoogleGenAI, Type } from "@google/genai";
import type { ColorResponse } from '../types';

const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set. Please set it to use the Gemini API.");
}

const ai = new GoogleGenAI({ apiKey });

const model = 'gemini-2.5-flash';

const prompt = `Analyze the provided image, which is a close-up view of a potential PET bottle cap. Your task is to identify the dominant color of the bottle cap.

Respond with a JSON object that strictly adheres to the following schema.
If no bottle cap or distinct solid color is identifiable, return "None" and a white hex code.
Do not provide any text or explanation outside of the JSON object.`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        colorName: {
            type: Type.STRING,
            description: "The common name of the color (e.g., 'Red', 'Blue', 'Green')."
        },
        hexCode: {
            type: Type.STRING,
            description: "The hexadecimal code for the color (e.g., '#FF0000')."
        },
    },
    required: ["colorName", "hexCode"],
};

export const identifyColor = async (base64ImageData: string): Promise<ColorResponse> => {
    try {
        if (!base64ImageData) {
            return { colorName: 'Error', hexCode: '#FF4136' };
        }
        
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64ImageData,
            },
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1,
            }
        });

        const jsonString = response.text.trim();
        const result: ColorResponse = JSON.parse(jsonString);

        if (typeof result.colorName === 'string' && typeof result.hexCode === 'string') {
            return result;
        } else {
             console.error("Invalid JSON structure received from API:", result);
             return { colorName: 'Error', hexCode: '#FF4136' };
        }

    } catch (error) {
        console.error("Error identifying color:", error);
        return { colorName: 'Error', hexCode: '#FF4136' };
    }
};
