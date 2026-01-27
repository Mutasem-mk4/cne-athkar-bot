const connectDB = require('../lib/db');
const Group = require('../models/Group');

module.exports = async (req, res) => {
    try {
        await connectDB();
        const groups = await Group.find({});

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
