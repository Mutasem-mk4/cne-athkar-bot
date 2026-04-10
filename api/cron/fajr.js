const botModule = require('../../bot');

const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
    // حماية من الاستدعاء الخارجي
    if (CRON_SECRET && req.headers['x-cron-secret'] !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('ℹ️ Fajr Cron reached - Deprecated. Fajr is now merged into Morning.');
    res.status(200).json({ status: 'success', message: 'Fajr skipped (deprecated)' });
};
