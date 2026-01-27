const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    chat_id: { type: String, required: true, unique: true },
    title: String,
    added_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);
