const { sendMidnightReminder, pendingPromises } = require('../../bot');

const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
    console.log('ℹ️ Midnight Cron reached - Deprecated. Message frequency reduced.');
    res.status(200).json({ status: 'success', message: 'Midnight skipped (deprecated)' });
};
