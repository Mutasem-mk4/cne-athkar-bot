const { sendEveningMessage, pendingPromises } = require('../../bot');

module.exports = async (req, res) => {
    try {
        console.log('Running Evening Cron...');
        await sendEveningMessage(undefined, false); // No video for 5:30 PM

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Evening Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
