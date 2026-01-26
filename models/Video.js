const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    chat_id: {
        type: String,
        required: true
    },
    message_id: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.Video || mongoose.model('Video', VideoSchema);
