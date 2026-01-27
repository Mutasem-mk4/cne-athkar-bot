const { sendMorningMessage, pendingPromises } = require('../../bot');

module.exports = async (req, res) => {
    try {
        console.log('Running Morning Cron...');
        await sendMorningMessage();

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Morning Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
