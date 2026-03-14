// ==========================================
// 🤖 CNE Athkar Bot - بوت أذكار الجامعة
// ==========================================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const connectDB = require('./lib/db');
const Video = require('./models/Video');
const Group = require('./models/Group');
const CommandLog = require('./models/CommandLog');
const {
  morningAthkar,
  eveningAthkar,
  verses,
  hadiths,
  quotes,
  duas,
  videos,
  fajrReminders
} = require('./data/content');

const { getAmmanPrayerTimes } = require('./lib/prayer');

// ==========================================
// 📌 الإعدادات
// ==========================================

const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
const TIMEZONE = process.env.TIMEZONE || 'Asia/Amman';
const ADMIN_ID = process.env.ADMIN_ID; // معرف المسؤول للبث

if (!BOT_TOKEN) {
  console.error('❌ خطأ: لم يتم تعيين BOT_TOKEN في ملف .env');
  if (require.main === module) process.exit(1);
}

// Check if running locally (not imported as a module)
const isLocal = require.main === module;

// إنشاء البوت
const bot = new TelegramBot(BOT_TOKEN, { polling: isLocal });

console.log(`✅ Bot Initialized. Mode: ${isLocal ? 'Polling (Local)' : 'Webhook (Serverless)'}`);
console.log('📿 CNE Athkar Bot');

// ==========================================
// 🛠️ Serverless Promise Tracking
// ==========================================
const pendingPromises = [];
function track(promise) {
  pendingPromises.push(promise);
  promise.finally(() => {
    const index = pendingPromises.indexOf(promise);
    if (index > -1) pendingPromises.splice(index, 1);
  });
  return promise;
}

// Intercept common methods to track them
['sendMessage', 'copyMessage', 'forwardMessage'].forEach(method => {
  if (bot[method]) {
    const original = bot[method].bind(bot);
    bot[method] = (...args) => track(original(...args));
  }
});

// ==========================================
// 🛠️ دوال مساعدة
// ==========================================
// Note: connectDB is imported from ./lib/db at top of file

const logCommand = (chatId, command) => {
  if (!chatId || !command) return;
  const promise = (async () => {
    try {
      await connectDB();
      const log = new CommandLog({ chat_id: chatId.toString(), command });
      await log.save();
    } catch (e) {
      console.error(`❌ Error logging ${command}:`, e.message);
    }
  })();
  track(promise);
};

async function registerGroup(chatId, title) {
  if (!chatId || (typeof chatId === 'string' && chatId.startsWith('-100') === false && chatId.startsWith('-') === false)) return;
  try {
    await connectDB();
    await Group.findOneAndUpdate(
      { chat_id: chatId.toString() },
      { title: title || 'Group', last_message_at: Date.now(), active: true, fail_count: 0 },
      { upsert: true }
    );
  } catch (error) {
    console.error('❌ Error registering group:', error.message);
  }
}

async function getAllGroups() {
  try {
    await connectDB();
    // نجلب المجموعات النشطة فقط (active: true)
    const dbGroups = await Group.find({ active: { $ne: false } });
    const chatIds = new Set(dbGroups.map(g => g.chat_id));
    if (GROUP_CHAT_ID) chatIds.add(GROUP_CHAT_ID.toString());
    return Array.from(chatIds);
  } catch (error) {
    console.error('❌ Error fetching groups:', error.message);
    return GROUP_CHAT_ID ? [GROUP_CHAT_ID.toString()] : [];
  }
}

// تسجيل فشل الإرسال - بعد 5 فشل متتالي يتم تعطيل المجموعة
async function markGroupFailed(chatId) {
  try {
    await connectDB();
    const group = await Group.findOne({ chat_id: chatId.toString() });
    if (!group) return;
    const newFailCount = (group.fail_count || 0) + 1;
    const shouldDeactivate = newFailCount >= 5;
    await Group.updateOne(
      { chat_id: chatId.toString() },
      {
        fail_count: newFailCount,
        last_failed_at: new Date(),
        ...(shouldDeactivate ? { active: false } : {})
      }
    );
    if (shouldDeactivate) {
      console.log(`⚠️ Group ${chatId} deactivated after ${newFailCount} consecutive failures.`);
    }
  } catch (e) {
    console.error('❌ Error marking group failed:', e.message);
  }
}

// إعادة تعيين عداد الفشل عند نجاح الإرسال
async function markGroupSuccess(chatId) {
  try {
    await connectDB();
    await Group.updateOne(
      { chat_id: chatId.toString(), fail_count: { $gt: 0 } },
      { fail_count: 0, active: true, last_message_at: new Date() }
    );
  } catch (e) {
    // silent, not critical
  }
}

// تنسيق أذكار الصباح (تصميم مريح للعين)
function formatMorningAthkar() {
  const selectedAthkar = [];
  const shuffled = [...morningAthkar].sort(() => 0.5 - Math.random());
  for (let i = 0; i < Math.min(2, shuffled.length); i++) {
    selectedAthkar.push(shuffled[i]);
  }

  let message = `🍃 *أذكار الصباح* 🍃\n\n`;

  selectedAthkar.forEach((thikr) => {
    message += `> ${thikr.text}\n`;
    message += `✨ عدد المرات: *${thikr.count}*\n\n`;
  });

  message += `🌥️ *للهِ مَا فِي قلوبنا، وللهِ كل السُّبل.*`;

  return message;
}

// تنسيق أذكار المساء (تصميم مريح للعين)
function formatEveningAthkar() {
  const selectedAthkar = [];
  const shuffled = [...eveningAthkar].sort(() => 0.5 - Math.random());
  for (let i = 0; i < Math.min(2, shuffled.length); i++) {
    selectedAthkar.push(shuffled[i]);
  }

  let message = `🌙 *أذكار المساء* 🌙\n\n`;

  selectedAthkar.forEach((thikr) => {
    message += `> ${thikr.text}\n`;
    message += `✨ عدد المرات: *${thikr.count}*\n\n`;
  });

  message += `🌖 *أمسينا وأمسى الملك لله.*`;

  return message;
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}


// ==========================================
// 📤 دوال النشر (Exported for Cron/API)
// ==========================================

const formatPrayerTimesMessage = (timings) => {
  return `🕋 مواقيت الصلاة اليوم (عمان)\n` +
    `━━━━━━━━━━━━━━━━\n` +
    ` Fajr:     ${timings.Fajr}\n` +
    ` Sunrise:  ${timings.Sunrise}\n` +
    ` Dhuhr:    ${timings.Dhuhr}\n` +
    ` Asr:      ${timings.Asr}\n` +
    ` Maghrib:  ${timings.Maghrib}\n` +
    ` Isha:     ${timings.Isha}\n` +
    `━━━━━━━━━━━━━━━━`;
};

/** @deprecated Use sendMorningMessage instead which handles Fajr blessing */
const sendFajrReminder = async (targetChatId) => {
  console.log('🕌 sendFajrReminder called (Deprecated - please use sendMorningMessage)');
  const randomMsg = getRandomItem(fajrReminders);
  const message = `🌙 تذكير صلاة الفجر 🌙\n━━━━━━━━━━━━━━━━\n\n${randomMsg}\n\n━━━━━━━━━━━━━━━━\nتقبل الله طاعاتكم 🤲`;
  
  const chatIds = targetChatId ? [targetChatId] : await getAllGroups();
  for (const id of chatIds) {
    try {
      await bot.sendMessage(id, message);
      markGroupSuccess(id);
    } catch (e) {
      markGroupFailed(id);
    }
  }
};

const sendMorningMessage = async (targetChatId) => {
  
  let morningContent = formatMorningAthkar();
  
  // Merge Fajr Reminder blessing at the top
  const fajrBlessing = getRandomItem(fajrReminders);
  morningContent = `💠 *طاب صباحكم بذكر الله*\n_${fajrBlessing}_\n\n${morningContent}`;

  const chatIds = targetChatId ? [targetChatId] : await getAllGroups();
  console.log('🌅 Sending MorningMessage to:', chatIds.length, 'groups');

  for (const id of chatIds) {
    try {
      await bot.sendMessage(id, morningContent, { parse_mode: 'Markdown' });
      markGroupSuccess(id);
    } catch (error) {
      console.error(`❌ Error sending Morning to ${id}:`, error.message);
      markGroupFailed(id);
    }
  }
};

const sendEveningMessage = async (targetChatId, includeVideo = true) => {
  if (targetChatId) {
    console.log('🌙 Sending single EveningMessage to:', targetChatId);
    await performSendEvening(targetChatId, includeVideo);
    return;
  }

  const chatIds = await getAllGroups();
  console.log('🌙 Starting bulk sendEveningMessage to:', chatIds.length, 'groups');

  for (const id of chatIds) {
    await performSendEvening(id, includeVideo);
  }
};

/** @deprecated Midnight reminder is removed to reduce message frequency */
const sendMidnightReminder = async (targetChatId) => {
  console.log('🌑 sendMidnightReminder called (Deprecated - no message sent)');
};


async function performSendEvening(targetChatId, includeVideo) {
  try {
    let message = formatEveningAthkar();
    
    await bot.sendMessage(targetChatId, message, { parse_mode: 'Markdown' });
    console.log(`✅ Evening sent to group: ${targetChatId}`);
    markGroupSuccess(targetChatId);
  } catch (error) {
    console.error(`❌ Error sending Evening to ${targetChatId}:`, error.message);
    markGroupFailed(targetChatId);
  }
}

// ==========================================
// ⏰ النشر التلقائي والمحلي (Local Cron)
// ==========================================

if (isLocal) {
  // Morning includes Fajr blessing and Friday reminders
  cron.schedule('00 8 * * *', () => sendMorningMessage(), { timezone: TIMEZONE });
  
  // Evening includes Friday 'Hour of Response'
  cron.schedule('00 17 * * *', () => sendEveningMessage(undefined, false), { timezone: TIMEZONE });

  console.log('⏰ Local Cron Jobs Scheduled (Reduced Frequency Mode)');
}

// ==========================================
// 💬 الأوامر
// ==========================================

const getMainMenu = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📿 ذكر عشوائي', callback_data: 'thikr' }, { text: '🕌 حديث شريف', callback_data: 'hadith' }],
        [{ text: '🕋 آية وتفسير', callback_data: 'verse' }, { text: '🤲 دعاء', callback_data: 'dua' }],
        [{ text: '🌅 أذكار الصباح', callback_data: 'morning' }, { text: '🌙 أذكار المساء', callback_data: 'evening' }],
        [{ text: '⏰ مواقيت الصلاة', callback_data: 'prayers' }, { text: '💡 خاطرة', callback_data: 'quote' }]
      ]
    },
    parse_mode: 'Markdown'
  };
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🌟 *أهلاً بك في بوت CNE Athkar*
📿 بوت أذكار قروب الجامعة

يمكنك استخدام القائمة أدناه للوصول السريع للأذكار والمحتوى الإسلامي:
  `;
  bot.sendMessage(chatId, welcomeMessage, getMainMenu());
});

bot.onText(/\/menu/, (msg) => {
  bot.sendMessage(msg.chat.id, '📋 *القائمة الرئيسية*', getMainMenu());
});

// التعامل مع الضغط على الأزرار
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;

  try {
    bot.answerCallbackQuery(callbackQuery.id).catch(() => { });
    logCommand(chatId, `btn_${action}`);

    switch (action) {
      case 'thikr':
        const allAthkar = [...morningAthkar, ...eveningAthkar];
        const thikr = getRandomItem(allAthkar);
        bot.sendMessage(chatId, `🍃 *ذكر*\n> ${thikr.text}\n\n✨ عدد المرات: *${thikr.count}*`, { parse_mode: 'Markdown' });
        break;
      case 'hadith':
        const h = getRandomItem(hadiths);
        bot.sendMessage(chatId, `🕌 *حديث شريف*\n> ${h.hadith}\n\n📍 الراوي: *${h.narrator}*\n💡 الشرح: ${h.explanation}`, { parse_mode: 'Markdown' });
        break;
      case 'verse':
        const v = getRandomItem(verses);
        bot.sendMessage(chatId, `🕋 *آية وتفسير*\n> ${v.verse}\n\n📍 السورة: *${v.surah}*\n📒 التفسير: ${v.tafsir}`, { parse_mode: 'Markdown' });
        break;
      case 'dua':
        bot.sendMessage(chatId, `🤲 *دعاء*\n> ${getRandomItem(duas)}`, { parse_mode: 'Markdown' });
        break;
      case 'morning':
        bot.sendMessage(chatId, formatMorningAthkar(), { parse_mode: 'Markdown' });
        break;
      case 'evening':
        bot.sendMessage(chatId, formatEveningAthkar(), { parse_mode: 'Markdown' });
        break;
      case 'prayers':
        const timings = await getAmmanPrayerTimes();
        bot.sendMessage(chatId, formatPrayerTimesMessage(timings), { parse_mode: 'Markdown' });
        break;
      case 'quote':
        const q = getRandomItem(quotes);
        bot.sendMessage(chatId, `💡 *خاطرة*\n> ${q.quote}\n\n✒️ القائل: *${q.author}*`, { parse_mode: 'Markdown' });
        break;

    }
  } catch (error) {
    console.error('Callback Error:', error);
    const errorMessage = `⚠️ عذراً، حدث خطأ: ${error.message}`;
    bot.sendMessage(chatId, errorMessage);
  }
});


bot.onText(/\/prayers/, async (msg) => {
  try {
    const timings = await getAmmanPrayerTimes();
    bot.sendMessage(msg.chat.id, formatPrayerTimesMessage(timings), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Prayers Command Error:', err.message);
    bot.sendMessage(msg.chat.id, `⚠️ عذراً، هنالك مشكلة: ${err.message}`);
  }
});

bot.onText(/\/help/, (msg) => {
  logCommand(msg.chat.id, 'help');
  const helpMessage = `📚 *دليل استخدام البوت*\n\n/morning - أذكار الصباح\n/evening - أذكار المساء\n/menu - القائمة الرئيسية\n/prayers - مواقيت الصلاة`;
  bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/thikr/, (msg) => {
  logCommand(msg.chat.id, 'thikr');
  const allAthkar = [...morningAthkar, ...eveningAthkar];
  const thikr = getRandomItem(allAthkar);
  bot.sendMessage(msg.chat.id, `🍃 *ذكر*\n> ${thikr.text}\n\n✨ عدد المرات: *${thikr.count}*`, { parse_mode: 'Markdown' });
});

bot.onText(/\/hadith/, (msg) => {
  logCommand(msg.chat.id, 'hadith');
  const h = getRandomItem(hadiths);
  bot.sendMessage(msg.chat.id, `🕌 *حديث شريف*\n> ${h.hadith}\n\n📍 الراوي: *${h.narrator}*\n💡 الشرح: ${h.explanation}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/verse/, (msg) => {
  logCommand(msg.chat.id, 'verse');
  const v = getRandomItem(verses);
  bot.sendMessage(msg.chat.id, `🕋 *آية وتفسير*\n> ${v.verse}\n\n📍 السورة: *${v.surah}*\n📒 التفسير: ${v.tafsir}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/dua/, (msg) => {
  logCommand(msg.chat.id, 'dua');
  bot.sendMessage(msg.chat.id, `🤲 *دعاء*\n> ${getRandomItem(duas)}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/quote/, (msg) => {
  logCommand(msg.chat.id, 'quote');
  const q = getRandomItem(quotes);
  bot.sendMessage(msg.chat.id, `💡 *خاطرة*\n> ${q.quote}\n\n✒️ القائل: *${q.author}*`, { parse_mode: 'Markdown' });
});

// نظام البث الإداري
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (ADMIN_ID && userId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(chatId, '⚠️ عذراً، هذا الأمر متاح للمسؤول فقط.');
  }

  const broadcastMsg = match[1];
  const chatIds = await getAllGroups();

  bot.sendMessage(chatId, `🚀 بدأت عملية البث إلى ${chatIds.length} وجهة...`);

  let success = 0;
  let fail = 0;

  for (const id of chatIds) {
    try {
      await bot.sendMessage(id, broadcastMsg);
      success++;
    } catch (e) {
      console.error(`Broadcast failed for ${id}:`, e.message);
      fail++;
    }
  }

  bot.sendMessage(chatId, `✅ اكتمل البث:\n- تم بنجاح: ${success}\n- فشل: ${fail}`);
});

// البث عبر الرد (Reply)
bot.onText(/\/broadcast$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (ADMIN_ID && userId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(chatId, '⚠️ عذراً، هذا الأمر متاح للمسؤول فقط.');
  }

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, 'ℹ️ يرجى الرد على الرسالة التي تريد بثها بكلمة `/broadcast` أو كتابة `/broadcast النص`.');
  }

  const chatIds = await getAllGroups();
  bot.sendMessage(chatId, `🚀 جاري إعادة توجيه الرسالة إلى ${chatIds.length} وجهة...`);

  let success = 0;
  let fail = 0;

  for (const id of chatIds) {
    try {
      await bot.copyMessage(id, msg.chat.id, msg.reply_to_message.message_id);
      success++;
    } catch (e) {
      fail++;
    }
  }

  bot.sendMessage(chatId, `✅ اكتمل التوجيه:\n- تم بنجاح: ${success}\n- فشل: ${fail}`);
});


// ذاكرة مؤقتة للإحصائيات لتجنب التعليق
let statsCache = { data: null, expire: 0 };

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (ADMIN_ID && userId.toString() !== ADMIN_ID.toString()) {
    return bot.sendMessage(chatId, '⚠️ عذراً، هذا الأمر متاح للمسؤول فقط.');
  }

  // استخدام الكاش إذا كان متاحاً (لمدة دقيقة)
  if (statsCache.data && Date.now() < statsCache.expire) {
    return bot.sendMessage(chatId, statsCache.data + "\n\n⏱️ (من الذاكرة المؤقتة)", { parse_mode: 'Markdown' });
  }

  try {
    await connectDB();

    // تشغيل الاستعلامات بالتوازي لتسريع الاستجابة
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalGroups, totalVideos, totalCommands, newGroups24h, topCommands] = await Promise.all([
      Group.countDocuments(),
      Video.countDocuments(),
      CommandLog.countDocuments(),
      Group.countDocuments({ added_at: { $gte: last24h } }),
      CommandLog.aggregate([
        { $group: { _id: "$command", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ])
    ]);

    let statsMsg = `📊 *إحصائيات البوت المتقدمة*\n`;
    statsMsg += `━━━━━━━━━━━━━━━━\n`;
    statsMsg += `👥 إجمالي الجروبات: ${totalGroups}\n`;
    statsMsg += `🎥 إجمالي الفيديوهات: ${totalVideos}\n`;
    statsMsg += `⌨️ إجمالي الأوامر المنفذة: ${totalCommands}\n`;
    statsMsg += `📈 نمو (آخر 24 ساعة): +${newGroups24h}\n\n`;

    statsMsg += `🔝 *الأوامر الأكثر استخداماً:*\n`;
    topCommands.forEach((cmd, i) => {
      statsMsg += `${i + 1}. /${cmd._id} (${cmd.count} مرة)\n`;
    });

    statsMsg += `━━━━━━━━━━━━━━━━\n`;
    statsMsg += `⚙️ Node.js: ${process.version}\n`;
    statsMsg += `🚀 العمليات النشطة: ${pendingPromises.length}`;

    // تحديث الكاش
    statsCache = {
      data: statsMsg,
      expire: Date.now() + 60 * 1000 // دقيقة واحدة
    };

    bot.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Stats Error:', e);
    bot.sendMessage(chatId, `❌ خطأ في جلب الإحصائيات: ${e.message}`);
  }
});

bot.onText(/\/morning/, (msg) => {
  logCommand(msg.chat.id, 'morning');
  bot.sendMessage(msg.chat.id, formatMorningAthkar(), { parse_mode: 'Markdown' });
});

bot.onText(/\/evening/, (msg) => {
  logCommand(msg.chat.id, 'evening');
  bot.sendMessage(msg.chat.id, formatEveningAthkar(), { parse_mode: 'Markdown' });
});

bot.onText(/\/chatid/, (msg) => {
  bot.sendMessage(msg.chat.id, `📍 Chat ID: \`${msg.chat.id}\``, { parse_mode: 'Markdown' });
});

bot.onText(/\/fajr/, (msg) => {
  logCommand(msg.chat.id, 'fajr');
  const randomMsg = getRandomItem(fajrReminders);
  const message = `🌙 *تذكير صلاة الفجر* 🌙\n━━━━━━━━━━━━━━━━━━\n\n${randomMsg}\n\n━━━━━━━━━━━━━━━━━━\n✨ *تقبل الله طاعاتكم*`;
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});


bot.onText(/\/test_morning/, (msg) => {
  console.log('🧪 Testing Morning...');
  const promise = sendMorningMessage(msg.chat.id)
    .catch(err => bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`));
  track(promise);
});

bot.onText(/\/test_fajr/, (msg) => {
  console.log('🧪 Testing Fajr...');
  const promise = sendFajrReminder(msg.chat.id)
    .catch(err => bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`));
  track(promise);
});

bot.onText(/\/test_evening/, async (msg) => {
  console.log('🧪 Testing Evening...');
  const promise = sendEveningMessage(msg.chat.id)
    .catch(err => bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`));
  track(promise);
});

bot.onText(/\/test_midnight/, async (msg) => {
  console.log('🧪 Testing Midnight...');
  const promise = sendMidnightReminder(msg.chat.id)
    .catch(err => bot.sendMessage(msg.chat.id, `❌ Error messages: ${err.message}`));
  track(promise);
});


bot.onText(/\/status/, (msg) => {
  const now = new Date();
  let status = `🤖 حالة البوت\n━━━━━━━━━━━━━━━━\n`;
  status += `✅ البوت يعمل (${isLocal ? 'Local' : 'Serverless'})\n`;
  status += `⏰ الوقت: ${now.toLocaleTimeString('ar-EG', { timeZone: TIMEZONE })}\n`;
  status += `🗄️ التخزين: MongoDB\n`;
  bot.sendMessage(msg.chat.id, status);
});

// حفظ الفيديوهات من الخاص (MongoDB) وتلقي رسائل الجروبات للتسجيل
bot.on('message', async (msg) => {
  // تسجيل الجروب تلقائياً
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    track(registerGroup(msg.chat.id, msg.chat.title));
  }

  if (msg.chat.type === 'private' && msg.video) {
    // Track this async operation as well
    const op = (async () => {
      try {
        await connectDB();
        let entry;
        if (msg.forward_from_chat && msg.forward_from_message_id) {
          entry = { chat_id: msg.forward_from_chat.id, message_id: msg.forward_from_message_id };
        } else {
          entry = { chat_id: msg.chat.id, message_id: msg.message_id };
        }

        const exists = await Video.findOne({ chat_id: entry.chat_id.toString(), message_id: entry.message_id.toString() });

        if (!exists) {
          await Video.create({
            chat_id: entry.chat_id.toString(),
            message_id: entry.message_id.toString()
          });
          await bot.sendMessage(msg.chat.id, '✅ تم حفظ الفيديو في قاعدة البيانات.');
        } else {
          await bot.sendMessage(msg.chat.id, '⚠️ هذا الفيديو محفوظ مسبقاً.');
        }
      } catch (error) {
        console.error('Error saving video:', error);
        await bot.sendMessage(msg.chat.id, '❌ حدث خطأ أثناء الحفظ.');
      }
    })();
    track(op); // Track this promise
  }
});

if (isLocal) {
  bot.on('polling_error', (error) => console.error('❌ Polling Error:', error.message));
}

// Export for Vercel
module.exports = {
  bot,
  sendFajrReminder,
  sendMorningMessage,
  sendEveningMessage,
  sendMidnightReminder,
  Video,
  pendingPromises
};
