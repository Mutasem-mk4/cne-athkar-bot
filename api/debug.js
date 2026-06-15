module.exports = (req, res) => {
    try {
        const envCheck = {
            BOT_TOKEN_EXISTS: !!process.env.BOT_TOKEN,
            BOT_TOKEN_LENGTH: process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 0,
            GROUP_CHAT_ID_EXISTS: !!process.env.GROUP_CHAT_ID,
            GROUP_CHAT_IDS_EXISTS: !!process.env.GROUP_CHAT_IDS,
            TIMEZONE: process.env.TIMEZONE,
            GITHUB_TOKEN_EXISTS: !!process.env.GITHUB_TOKEN,
            GITHUB_REPO_EXISTS: !!process.env.GITHUB_REPO,
            GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',
            NODE_VERSION: process.version,
            STORAGE_MODE: (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) ? 'GitHub DB' : 'Local JSON'
        };

        res.status(200).json({ status: 'debug_info', env: envCheck });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};
