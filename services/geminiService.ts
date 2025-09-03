import { GoogleGenAI, Type } from "@google/genai";
import type { ColorResponse } from '../types';

const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set. Please set it to use the Gemini API.");
}

const ai = new GoogleGenAI({ apiKey });

const model = 'gemini-2.5-flash';

const prompt = `Analise a imagem fornecida, que é uma visão de perto de uma potencial tampa de garrafa PET. Sua tarefa é identificar a cor dominante da tampa da garrafa.

Responda com um objeto JSON que siga estritamente o esquema a seguir.
Se nenhuma tampa de garrafa ou cor sólida distinta for identificável, retorne "Nenhuma" e um código hexadecimal branco.
Não forneça nenhum texto ou explicação fora do objeto JSON.`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        colorName: {
            type: Type.STRING,
            description: "O nome comum da cor (ex: 'Vermelho', 'Azul', 'Verde')."
        },
        hexCode: {
            type: Type.STRING,
            description: "O código hexadecimal para a cor (ex: '#FF0000')."
        },
    },
    required: ["colorName", "hexCode"],
};

export const identifyColor = async (base64ImageData: string): Promise<ColorResponse> => {
    try {
        if (!base64ImageData) {
            return { colorName: 'Erro', hexCode: '#FF4136' };
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
             return { colorName: 'Erro', hexCode: '#FF4136' };
        }

    } catch (error) {
        console.error("Error identifying color:", error);
        return { colorName: 'Erro', hexCode: '#FF4136' };
    }
};