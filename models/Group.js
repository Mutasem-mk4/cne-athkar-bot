const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    chat_id: { type: String, required: true, unique: true },
    title: String,
    added_at: { type: Date, default: Date.now },
    last_message_at: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },     // هل البوت لا يزال في المجموعة؟
    fail_count: { type: Number, default: 0 },     // عدد مرات فشل الإرسال المتتالية
    last_failed_at: { type: Date, default: null } // تاريخ آخر فشل
});

module.exports = mongoose.model('Group', GroupSchema);
