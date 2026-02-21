const { sendFajrReminder, pendingPromises } = require('../../bot');

const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
    // حماية من الاستدعاء الخارجي
    if (CRON_SECRET && req.headers['x-cron-secret'] !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('🕌 Running scheduled Fajr reminder...');
        await sendFajrReminder();

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({ status: 'success', task: 'fajr' });
    } catch (error) {
        console.error('Fajr Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
