const { sendFajrReminder, pendingPromises } = require('../../bot');

const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
    console.log('ℹ️ Fajr Cron reached - Deprecated. Fajr is now merged into Morning.');
    res.status(200).json({ status: 'success', message: 'Fajr skipped (deprecated)' });
};
