const { sendMorningMessage } = require('../../bot');

module.exports = async (req, res) => {
    try {
        console.log('Running Morning Cron...');
        await sendMorningMessage(); // Sends to default chat ID
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Morning Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
