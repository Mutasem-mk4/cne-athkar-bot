const { sendFajrReminder, pendingPromises } = require('../../bot');

module.exports = async (req, res) => {
    try {
        console.log('🕌 Running scheduled Fajr reminder...');
        await sendFajrReminder();

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).send('Fajr reminder task completed');
    } catch (error) {
        console.error('Fajr Cron Error:', error);
        res.status(500).send('Error: ' + error.message);
    }
};
