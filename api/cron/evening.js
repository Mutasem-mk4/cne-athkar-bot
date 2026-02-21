const { sendEveningMessage, sendFridayReminder, pendingPromises } = require('../../bot');

const CRON_SECRET = process.env.CRON_SECRET;

module.exports = async (req, res) => {
    // حماية من الاستدعاء الخارجي
    if (CRON_SECRET && req.headers['x-cron-secret'] !== CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Running Evening Cron...');
        await sendEveningMessage(undefined, false);

        // تذكير ساعة الاستجابة (الجمعة)
        const day = new Date().getUTCDay(); // 5 = Friday
        if (day === 5) {
            console.log('Today is Friday! Sending Hour of Response reminder...');
            await sendFridayReminder(undefined, 'hourOfResponse');
        }

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({ status: 'success', task: 'evening' });
    } catch (error) {
        console.error('Evening Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
