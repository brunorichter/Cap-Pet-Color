import type { ColorResponse } from '../types';

// Cores pré-definidas com base nas cores comuns de tampas PET
const PREDEFINED_COLORS = [
    { name: 'Vermelho', r: 200, g: 0, b: 0, hex: '#FF0000' },
    { name: 'Verde', r: 0, g: 128, b: 0, hex: '#008000' },
    { name: 'Azul', r: 0, g: 0, b: 255, hex: '#0000FF' },
    { name: 'Amarelo', r: 255, g: 255, b: 0, hex: '#FFFF00' },
    { name: 'Laranja', r: 255, g: 165, b: 0, hex: '#FFA500' },
    { name: 'Branco', r: 240, g: 240, b: 240, hex: '#F0F0F0' },
    { name: 'Preto', r: 20, g: 20, b: 20, hex: '#141414' },
    { name: 'Roxo', r: 128, g: 0, b: 128, hex: '#800080' },
    { name: 'Ciano', r: 0, g: 255, b: 255, hex: '#00FFFF' },
];

// Calcula a distância euclidiana no espaço de cores RGB
const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
};

export const identifyColorByRgb = (imageData: ImageData): ColorResponse => {
    const data = imageData.data;
    const pixelCount = data.length / 4;

    if (pixelCount === 0) {
        return { colorName: 'Nenhuma', hexCode: '#FFFFFF' };
    }

    let totalR = 0, totalG = 0, totalB = 0;

    // Calcula a cor média
    for (let i = 0; i < data.length; i += 4) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
    }

    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    
    // Verifica se a cor é muito escura, muito clara ou sem saturação (cinza)
    const saturation = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);
    const brightness = (avgR + avgG + avgB) / 3;

    if (saturation < 25 || brightness < 40 || brightness > 220) {
         return { colorName: 'Nenhuma', hexCode: '#FFFFFF' };
    }

    // Encontra a cor pré-definida mais próxima
    let closestColor = PREDEFINED_COLORS[0];
    let minDistance = Infinity;

    for (const color of PREDEFINED_COLORS) {
        const distance = colorDistance(avgR, avgG, avgB, color.r, color.g, color.b);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }
    
    // Se a cor mais próxima ainda estiver muito distante, considera como "Nenhuma"
    if (minDistance > 120) {
        return { colorName: 'Nenhuma', hexCode: '#FFFFFF' };
    }

    return {
        colorName: closestColor.name,
        hexCode: closestColor.hex,
    };
};
