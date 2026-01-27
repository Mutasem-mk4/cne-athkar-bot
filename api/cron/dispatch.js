const { sendFajrReminder, sendMorningMessage, sendEveningMessage, pendingPromises } = require('../../bot');

module.exports = async (req, res) => {
    try {
        const now = new Date();
        const hour = now.getUTCHours();
        const minute = now.getUTCMinutes();

        console.log(`⏰ Cron triggered at ${hour}:${minute} UTC`);

        // 2:30 UTC -> 5:30 Amman (Fajr)
        if (hour === 2) {
            console.log('🕌 Dispatching Fajr Reminder...');
            await sendFajrReminder();
        }
        // 5:30 UTC -> 8:30 Amman (Morning)
        else if (hour === 5) {
            console.log('🌅 Dispatching Morning Athkar...');
            await sendMorningMessage();
        }
        // 14:30 UTC -> 17:30 Amman (Evening)
        else if (hour === 14) {
            console.log('🌙 Dispatching Evening Athkar...');
            await sendEveningMessage(undefined, false);
        } else {
            console.log('ℹ️ No task scheduled for this hour.');
        }

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({
            status: 'success',
            hour,
            message: 'Dispatch completed'
        });
    } catch (error) {
        console.error('❌ Dispatch Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
