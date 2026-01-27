require('dotenv').config();
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = 'https://cne-athkar-bot.vercel.app/api/webhook';

if (!BOT_TOKEN) {
    console.error('❌ Error: BOT_TOKEN is missing in .env');
    process.exit(1);
}

const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}`;

console.log(`🔗 Setting webhook to: ${WEBHOOK_URL}`);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (response.ok) {
                console.log('✅ Webhook Response:', response);
            } else {
                console.error('❌ Failed to set webhook:', response);
            }
        } catch (e) {
            console.error('❌ Error parsing response:', e.message);
        }
    });

}).on('error', (err) => {
    console.error('❌ Request error:', err.message);
});
