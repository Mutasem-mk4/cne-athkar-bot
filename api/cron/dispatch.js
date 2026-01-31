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

        // Dispatcher is now retired in favor of specific endpoints.
        console.log('ℹ️ Dispatcher reached - ignoring automated task to prevent duplicates.');
        // No action taken here. 


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
