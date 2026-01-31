// Image generator with lazy loading to prevent crash if canvas fails
const path = require('path');
const fs = require('fs');

let canvas = null;
let GlobalFonts = null;
let arabicReshaper = null;
let bidi = null;
let fontFamily = 'sans-serif';
let initialized = false;
let initError = null;

const initCanvas = () => {
    if (initialized) return !initError;
    initialized = true;

    try {
        const canvasModule = require('@napi-rs/canvas');
        canvas = canvasModule;
        GlobalFonts = canvasModule.GlobalFonts;
        arabicReshaper = require('arabic-reshaper');
        bidi = require('bidi-js')();

        // Try to load Arabic font
        const fontPath = path.join(__dirname, '..', 'fonts', 'Tajawal-Regular.ttf');
        if (fs.existsSync(fontPath)) {
            GlobalFonts.registerFromPath(fontPath, 'Tajawal');
            fontFamily = 'Tajawal, sans-serif';
            console.log('✅ Arabic font loaded successfully');
        }

        console.log('✅ Canvas initialized successfully');
        return true;
    } catch (err) {
        initError = err;
        console.error('❌ Canvas initialization failed:', err.message);
        return false;
    }
};

const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

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
    if (!arabicReshaper || !bidi) return text;
    try {
        const reshaped = arabicReshaper.reshape(text);
        return bidi.getDisplay(reshaped);
    } catch (e) {
        return text;
    }
};

const generateAthkarImage = async (text, title = 'CNE Athkar') => {
    if (!initCanvas()) {
        throw new Error('Canvas not available: ' + (initError ? initError.message : 'Unknown error'));
    }

    const width = 1080;
    const height = 1080;
    const cvs = canvas.createCanvas(width, height);
    const ctx = cvs.getContext('2d');

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
    ctx.font = `bold 50px ${fontFamily}`;
    ctx.textAlign = 'center';
    const reshapedTitle = processArabicText(title);
    ctx.fillText(reshapedTitle, width / 2, 120);

    // 4. Content Text
    const fontSize = 45;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const maxWidth = 800;

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
    ctx.font = `30px ${fontFamily}`;
    ctx.fillText('@CNE_Athkar_Bot', width / 2, height - 100);

    return cvs.toBuffer('image/png');
};

module.exports = { generateAthkarImage };
