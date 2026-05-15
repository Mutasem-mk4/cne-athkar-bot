const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://cne-athkar-bot.vercel.app/api/webhook';

function telegramRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        if (!BOT_TOKEN) {
            reject(new Error('BOT_TOKEN is missing'));
            return;
        }

        const query = new URLSearchParams(params).toString();
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}${query ? `?${query}` : ''}`;

        https.get(url, (response) => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const body = JSON.parse(data);
                    if (!body.ok) {
                        reject(new Error(body.description || `Telegram ${method} failed`));
                        return;
                    }
                    resolve(body.result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

module.exports = async (req, res) => {
    try {
        const action = req.query.action || 'info';

        if (action === 'setWebhook') {
            await telegramRequest('setWebhook', { url: WEBHOOK_URL });
        }

        const [info, me] = await Promise.all([
            telegramRequest('getWebhookInfo'),
            telegramRequest('getMe')
        ]);
        res.status(200).json({
            status: 'ok',
            bot_username: me.username,
            webhook_url: info.url,
            has_custom_certificate: info.has_custom_certificate,
            pending_update_count: info.pending_update_count,
            last_error_date: info.last_error_date,
            last_error_message: info.last_error_message,
            max_connections: info.max_connections,
            allowed_updates: info.allowed_updates || []
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
};
