const { bot, pendingPromises } = require('../bot');

module.exports = async (req, res) => {
    try {
        if (req.body) {
            await bot.processUpdate(req.body);

            // 🛠️ Serverless Fix: Wait for async operations (sendMessage, etc)
            if (pendingPromises && pendingPromises.length > 0) {
                await Promise.all(pendingPromises);
            }
        }
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: error.message });
    }
};
