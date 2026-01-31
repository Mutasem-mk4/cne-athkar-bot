const { sendMorningMessage, pendingPromises } = require('../../bot');

module.exports = async (req, res) => {
    try {
        console.log('Running Morning Cron...');
        await sendMorningMessage();

        // تذكيرات يوم الجمعة
        const day = new Date().getUTCDay(); // 5 = Friday
        if (day === 5) {
            console.log('Today is Friday! Sending Salawat and Kahf reminders...');
            await sendFridayReminder(undefined, 'salawat');
            await sendFridayReminder(undefined, 'kahf');
        }

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Morning Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
