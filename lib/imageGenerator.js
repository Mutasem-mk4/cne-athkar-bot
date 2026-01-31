const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const arabicReshaper = require('arabic-reshaper');
const bidi = require('bidi-js')();

const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
};

const processArabicText = (text) => {
    const reshaped = arabicReshaper.reshape(text);
    const bidiResult = bidi.getDisplay(reshaped);
    return bidiResult;
};

/**
 * Generates an image from text
 * @param {string} text - The content to write
 * @param {string} title - Optional title (e.g., Hadith, Verse)
 * @returns {Buffer} - Image buffer
 */
const generateAthkarImage = async (text, title = 'CNE Athkar') => {
    const width = 1080;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e3c72');
    gradient.addColorStop(1, '#2a5298');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Artistic Border/Overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 3. Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px Arial'; // System font fallback
    ctx.textAlign = 'center';
    const reshapedTitle = processArabicText(title);
    ctx.fillText(reshapedTitle, width / 2, 120);

    // 4. Content Text
    const fontSize = 45;
    ctx.font = `${fontSize}px Arial`;
    const maxWidth = 800;

    // Wrap and Process each line for RTL
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = fontSize * 1.6;
    const totalHeight = lines.length * lineHeight;
    let startY = (height - totalHeight) / 2 + 50;

    lines.forEach((line) => {
        const processedLine = processArabicText(line);
        ctx.fillText(processedLine, width / 2, startY);
        startY += lineHeight;
    });

    // 5. Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '30px Arial';
    ctx.fillText('@CNE_Athkar_Bot', width / 2, height - 100);

    return canvas.toBuffer('image/png');
};

module.exports = { generateAthkarImage };
