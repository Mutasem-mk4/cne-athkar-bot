const mongoose = require('mongoose');

module.exports = (req, res) => {
    try {
        const envCheck = {
            BOT_TOKEN_EXISTS: !!process.env.BOT_TOKEN,
            BOT_TOKEN_LENGTH: process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 0,
            GROUP_CHAT_ID_EXISTS: !!process.env.GROUP_CHAT_ID,
            TIMEZONE: process.env.TIMEZONE,
            MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
            NODE_VERSION: process.version,
            MONGO_STATE: mongoose.connection.readyState
        };

        res.status(200).json({ status: 'debug_info', env: envCheck });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};
