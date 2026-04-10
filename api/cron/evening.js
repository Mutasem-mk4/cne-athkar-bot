const botModule = require('../../bot');

const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
    // حماية من الاستدعاء الخارجي
    if (CRON_SECRET && req.headers['x-cron-secret'] !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Running Evening Cron...');
        await botModule.sendEveningMessage(undefined, false);

        if (botModule.pendingPromises && botModule.pendingPromises.length > 0) {
            await Promise.all(botModule.pendingPromises);
        }

        res.status(200).json({ status: 'success', task: 'evening' });
    } catch (error) {
        console.error('Evening Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
