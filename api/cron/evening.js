const { sendEveningMessage } = require('../../bot');

module.exports = async (req, res) => {
    try {
        console.log('Running Evening Cron...');
        await sendEveningMessage(); // Sends to default chat ID
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Evening Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
