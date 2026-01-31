const mongoose = require('mongoose');

const CommandLogSchema = new mongoose.Schema({
    chat_id: { type: String, required: true },
    command: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommandLog', CommandLogSchema);
