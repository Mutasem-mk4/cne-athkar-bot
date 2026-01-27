const { sendEveningMessage, pendingPromises } = require('../../bot');

module.exports = async (req, res) => {
    try {
        console.log('🧪 Running scheduled test video...');
        await sendEveningMessage();

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).send('Test video scheduled task completed');
    } catch (error) {
        console.error('Test Schedule Error:', error);
        res.status(500).send('Error: ' + error.message);
    }
};
