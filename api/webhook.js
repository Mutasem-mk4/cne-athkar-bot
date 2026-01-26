const { bot } = require('../bot');

module.exports = async (req, res) => {
    try {
        if (req.body) {
            await bot.processUpdate(req.body);
        }
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: error.message });
    }
};
