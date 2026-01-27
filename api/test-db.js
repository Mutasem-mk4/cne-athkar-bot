const mongoose = require('mongoose');
const connectDB = require('../lib/db');

// Standalone Schema for testing
const VideoSchema = new mongoose.Schema({
    file_id: String,
    chat_id: Number,
    message_id: Number,
    title: String,
    date: { type: Date, default: Date.now }
});

const Video = mongoose.models.Video || mongoose.model('Video', VideoSchema);

module.exports = async (req, res) => {
    try {
        console.log('🔍 Standalone DB Test started...');
        await connectDB();
        console.log('✅ Connected.');

        const count = await Video.countDocuments();
        console.log('📊 Count:', count);

        res.status(200).json({
            status: 'success',
            count,
            dbState: mongoose.connection.readyState
        });
    } catch (error) {
        console.error('❌ Test Fail:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
