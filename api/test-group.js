const { bot, pendingPromises } = require('../bot');

module.exports = async (req, res) => {
    const groupId = process.env.GROUP_CHAT_ID;
    try {
        console.log('🧪 Testing direct message to group:', groupId);
        await bot.sendMessage(groupId, '🔔 تجربة: هل البوت شغال في الجروب؟');

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({ status: 'sent', group: groupId });
    } catch (error) {
        console.error('❌ Group Test Error:', error.message);
        res.status(500).json({ error: error.message, group: groupId });
    }
};
