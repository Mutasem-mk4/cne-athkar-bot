const db = require('../lib/db');

module.exports = async (req, res) => {
    try {
        const sources = await db.getGroupSources();
        const groups = sources.dbGroups;

        // Mask chat IDs for privacy/security display
        const safeGroups = groups.map(g => ({
            title: g.title,
            id_preview: g.chat_id.toString().slice(0, 4) + '...' + g.chat_id.toString().slice(-4),
            added_at: g.added_at
        }));

        res.status(200).json({
            count: groups.length,
            groups: safeGroups
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
