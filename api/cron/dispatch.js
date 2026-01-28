const {
    sendFajrReminder,
    sendMorningMessage,
    sendEveningMessage,
    sendMidnightReminder,
    pendingPromises
} = require('../../bot');

module.exports = async (req, res) => {
    try {
        const now = new Date();
        const hour = now.getUTCHours();
        const minute = now.getUTCMinutes();

        console.log(`⏰ Cron triggered at ${hour}:${minute} UTC`);

        // 03:00 UTC -> 6:00 Amman (Fajr)
        if (hour === 3) {
            console.log('🕌 Dispatching Fajr Reminder...');
            await sendFajrReminder();
        }
        // 05:00 UTC -> 8:00 Amman (Morning)
        else if (hour === 5) {
            console.log('🌅 Dispatching Morning Athkar...');
            await sendMorningMessage();
        }
        // 15:00 UTC -> 18:00 Amman (Evening)
        else if (hour === 15) {
            console.log('🌙 Dispatching Evening Athkar...');
            await sendEveningMessage(undefined, false);
        }
        // 21:00 UTC -> 00:00 Amman (Midnight)
        else if (hour === 21) {
            console.log('🌑 Dispatching Midnight Reminder...');
            await sendMidnightReminder();
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
