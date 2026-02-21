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
  fajrReminders,
  fridayReminders
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
      { title: title || 'Group', last_message_at: Date.now() },
      { upsert: true }
    );
  } catch (error) {
    console.error('❌ Error registering group:', error.message);
  }
}

async function getAllGroups() {
  try {
    await connectDB();
    const dbGroups = await Group.find();
    const chatIds = new Set(dbGroups.map(g => g.chat_id));
    if (GROUP_CHAT_ID) chatIds.add(GROUP_CHAT_ID.toString());
    return Array.from(chatIds);
  } catch (error) {
    console.error('❌ Error fetching groups:', error.message);
    return GROUP_CHAT_ID ? [GROUP_CHAT_ID.toString()] : [];
  }
}

// تنسيق أذكار الصباح
function formatMorningAthkar() {
  let message = `🌿 إشراقة الصباح 🌿\n\n`;

  // Select 3 random Athkar
  const selectedAthkar = [];
  const shuffled = [...morningAthkar].sort(() => 0.5 - Math.random());
  for (let i = 0; i < Math.min(3, shuffled.length); i++) {
    selectedAthkar.push(shuffled[i]);
  }

  selectedAthkar.forEach((thikr, index) => {
    message += `🟢 ${thikr.text}\n`;
    message += `   🎐 ${thikr.count}\n\n`;
  });

  message += `🤲 اللهم بارك لنا في يومنا هذا، واجعل خطواتنا فيه رضا لك.\n`;

  return message;
}

// تنسيق أذكار المساء (قائمة فقط)
function formatEveningAthkar() {
  let message = `🌒 همسة المساء 🌒\n\n`;

  const selectedAthkar = [];
  const shuffled = [...eveningAthkar].sort(() => 0.5 - Math.random());
  for (let i = 0; i < Math.min(3, shuffled.length); i++) {
    selectedAthkar.push(shuffled[i]);
  }

  selectedAthkar.forEach((thikr, index) => {
    message += `🟢 ${thikr.text}\n`;
    message += `   🎐 ${thikr.count}\n\n`;
  });

  message += `🤲 أمسينا وأمسى الملك لله.\n`;

  return message;
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatMidnightContent() {
  const contentTypes = ['verse', 'hadith', 'quote', 'dua'];
  const selectedType = getRandomItem(contentTypes);

  let message = `🌑 همسة آخر الليل 🌑\n\n`;

  switch (selectedType) {
    case 'verse':
      const verse = getRandomItem(verses);
      message += `🕋 آية وتفسير\n\n`;
      message += `📜 ${verse.verse}\n\n`;
      message += `📒 التفسير: ${verse.tafsir}\n`;
      message += `📍 ${verse.surah}`;
      break;

    case 'hadith':
      const hadith = getRandomItem(hadiths);
      message += `🕌 حديث شريف\n\n`;
      message += `📜 ${hadith.hadith}\n\n`;
      message += `📒 الشرح: ${hadith.explanation}\n`;
      message += `📍 ${hadith.narrator}`;
      break;

    case 'quote':
      const quote = getRandomItem(quotes);
      message += `💡 خاطرة\n\n`;
      message += `"${quote.quote}"\n\n`;
      message += `✒️ ${quote.author}`;
      break;

    case 'dua':
      const dua = getRandomItem(duas);
      message += `🤲 دعاء\n\n`;
      message += `${dua}`;
      break;
  }

  message += `\n\nتصبحون على خير 💫`;

  return message;
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

const sendFajrReminder = async (targetChatId) => {
  let extraContent = '';
  try {
    const timings = await getAmmanPrayerTimes();
    extraContent = `\n\n${formatPrayerTimesMessage(timings)}`;
  } catch (err) {
    console.error('Error fetching prayer times for reminder:', err.message);
  }

  const randomMsg = getRandomItem(fajrReminders);
  const message = `🕌 صلاة الفجر\n\n${randomMsg}${extraContent}\n\nتقبل الله طاعاتكم 🤲`;

  if (targetChatId) {
    console.log('🕌 Sending single FajrReminder to:', targetChatId);
    try {
      await bot.sendMessage(targetChatId, message);
    } catch (e) {
      console.error('❌ Error sending single Fajr:', e.message);
    }
    return;
  }

  const chatIds = await getAllGroups();
  console.log('🕌 Starting bulk sendFajrReminder to:', chatIds.length, 'groups');

  for (const id of chatIds) {
    try {
      await bot.sendMessage(id, message);
      console.log(`✅ Fajr sent to group: ${id}`);
    } catch (error) {
      console.error(`❌ Error sending Fajr to ${id}:`, error.message);
    }
  }
};

const sendMorningMessage = async (targetChatId) => {
  if (targetChatId) {
    console.log('🌅 Sending single MorningMessage to:', targetChatId);
    try {
      const message = formatMorningAthkar();
      await bot.sendMessage(targetChatId, message);
    } catch (e) {
      console.error('❌ Error sending single Morning:', e.message);
    }
    return;
  }

  const chatIds = await getAllGroups();
  console.log('🌅 Starting bulk sendMorningMessage to:', chatIds.length, 'groups');

  for (const id of chatIds) {
    try {
      const message = formatMorningAthkar();
      await bot.sendMessage(id, message);
      console.log(`✅ Morning sent to group: ${id}`);
    } catch (error) {
      console.error(`❌ Error sending Morning to ${id}:`, error.message);
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

const sendMidnightReminder = async (targetChatId) => {
  // Midnight content logic (Verse, Hadith, or Dua only)
  const types = ['verse', 'hadith', 'dua'];
  const type = getRandomItem(types);

  let message = `🌑 همسة آخر الليل 🌑\n\n`;

  if (type === 'verse') {
    const v = getRandomItem(verses);
    message += `📜 ${v.verse}\n\n${v.tafsir}\n📍 ${v.surah}`;
  } else if (type === 'hadith') {
    const h = getRandomItem(hadiths);
    message += `🕌 ${h.hadith}\n\n${h.explanation}\n📍 ${h.narrator}`;
  } else {
    message += `🤲 ${getRandomItem(duas)}`;
  }

  message += `\n\nتصبحون على خير 💫`;

  if (targetChatId) {
    await bot.sendMessage(targetChatId, message);
    return;
  }

  const chatIds = await getAllGroups();
  for (const id of chatIds) {
    try {
      await bot.sendMessage(id, message);
    } catch (e) {
      console.error(`Error sending midnight to ${id}:`, e.message);
    }
  }
};

const sendFridayReminder = async (targetChatId, type = 'salawat') => {
  const content = fridayReminders[type];
  if (!content) return;

  const chatIds = targetChatId ? [targetChatId] : await getAllGroups();
  console.log(`📅 Sending Friday ${type} reminder to:`, chatIds.length, 'groups');

  for (const id of chatIds) {
    try {
      await bot.sendMessage(id, content);
    } catch (error) {
      console.error(`❌ Error sending Friday ${type} to ${id}:`, error.message);
    }
  }
};

async function performSendEvening(targetChatId, includeVideo) {
  try {
    // 1. Try to Send Video from MongoDB (Optional)
    // ⚠️ User requested NO videos at night/evening. Logic disabled.
    /*
    if (includeVideo) {
      try {
        await connectDB();
        const count = await Video.countDocuments();
        if (count > 0) {
          const randomIndex = Math.floor(Math.random() * count);
          const video = await Video.findOne().skip(randomIndex);
          if (video) {
            await bot.copyMessage(targetChatId, video.chat_id, video.message_id);
          }
        } else if (videos && videos.length > 0) {
          const staticVideo = getRandomItem(videos);
          const videoMessage = `🎬 *فيديو اليوم*\n\n${staticVideo.title}\n\n${staticVideo.url}`;
          await bot.sendMessage(targetChatId, videoMessage);
        }
      } catch (dbError) {
        console.error('⚠️ DB/Video Error (Skipping video):', dbError.message);
      }
    }
    */

    // 2. Send Text Content
    // Evening now strictly sends Athkar list, no random content.
    const message = formatEveningAthkar();
    await bot.sendMessage(targetChatId, message);
    console.log(`✅ Evening sent to group: ${targetChatId}`);
  } catch (error) {
    console.error(`❌ Error sending Evening to ${targetChatId}:`, error.message);
  }
}

// ==========================================
// ⏰ النشر التلقائي والمحلي (Local Cron)
// ==========================================

if (isLocal) {
  cron.schedule('00 5 * * *', () => sendFajrReminder(), { timezone: TIMEZONE });
  cron.schedule('00 8 * * *', () => sendMorningMessage(), { timezone: TIMEZONE });
  cron.schedule('00 17 * * *', () => sendEveningMessage(undefined, false), { timezone: TIMEZONE });

  // Friday Special Reminders (Local Cron)
  cron.schedule('00 10 * * 5', () => {
    console.log('📅 Friday Morning: Sending Salawat and Kahf...');
    sendFridayReminder(undefined, 'salawat');
    sendFridayReminder(undefined, 'kahf');
  }, { timezone: TIMEZONE });

  cron.schedule('00 16 * * 5', () => {
    console.log('📅 Friday Afternoon: Sending Hour of Response...');
    sendFridayReminder(undefined, 'hourOfResponse');
  }, { timezone: TIMEZONE });

  console.log('⏰ Local Cron Jobs Scheduled');
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
        bot.sendMessage(chatId, `📿 ذكر\n\n${thikr.text}\n\n📖 ${thikr.count}`);
        break;
      case 'hadith':
        const h = getRandomItem(hadiths);
        bot.sendMessage(chatId, `🕌 حديث شريف\n\n${h.hadith}\n\n📍 ${h.narrator}\n\n💡 الشرح: ${h.explanation}`);
        break;
      case 'verse':
        const v = getRandomItem(verses);
        bot.sendMessage(chatId, `🕋 آية وتفسير\n\n${v.verse}\n\n📍 ${v.surah}\n\n📒 التفسير: ${v.tafsir}`);
        break;
      case 'dua':
        bot.sendMessage(chatId, `🤲 دعاء\n\n${getRandomItem(duas)}`);
        break;
      case 'morning':
        bot.sendMessage(chatId, formatMorningAthkar());
        break;
      case 'evening':
        bot.sendMessage(chatId, formatEveningAthkar());
        break;
      case 'prayers':
        const timings = await getAmmanPrayerTimes();
        bot.sendMessage(chatId, formatPrayerTimesMessage(timings));
        break;
      case 'quote':
        const q = getRandomItem(quotes);
        bot.sendMessage(chatId, `💡 خاطرة\n\n"${q.quote}"\n\n✒️ ${q.author}`);
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
    bot.sendMessage(msg.chat.id, formatPrayerTimesMessage(timings));
  } catch (err) {
    console.error('Prayers Command Error:', err.message);
    bot.sendMessage(msg.chat.id, `⚠️ عذراً، هنالك مشكلة: ${err.message}`);
  }
});

bot.onText(/\/help/, (msg) => {
  logCommand(msg.chat.id, 'help');
  const helpMessage = `📚 *دليل استخدام البوت*\n\n/thikr - ذكر\n/morning - أذكار الصباح\n/evening - أذكار المساء\n...`;
  bot.sendMessage(msg.chat.id, helpMessage);
});

bot.onText(/\/thikr/, (msg) => {
  logCommand(msg.chat.id, 'thikr');
  const allAthkar = [...morningAthkar, ...eveningAthkar];
  const thikr = getRandomItem(allAthkar);
  bot.sendMessage(msg.chat.id, `📿 ذكر\n\n${thikr.text}\n\n📖 ${thikr.count}`);
});

bot.onText(/\/hadith/, (msg) => {
  logCommand(msg.chat.id, 'hadith');
  const hadith = getRandomItem(hadiths);
  bot.sendMessage(msg.chat.id, `🕌 حديث شريف\n\n${hadith.hadith}\n\n📍 ${hadith.narrator}\n\n💡 الشرح: ${hadith.explanation}`);
});

bot.onText(/\/verse/, (msg) => {
  logCommand(msg.chat.id, 'verse');
  const verse = getRandomItem(verses);
  bot.sendMessage(msg.chat.id, `🕋 آية وتفسير\n\n${verse.verse}\n\n📍 ${verse.surah}\n\n📒 التفسير: ${verse.tafsir}`);
});

bot.onText(/\/dua/, (msg) => {
  logCommand(msg.chat.id, 'dua');
  const dua = getRandomItem(duas);
  bot.sendMessage(msg.chat.id, `🤲 دعاء\n\n${dua}`);
});

bot.onText(/\/quote/, (msg) => {
  logCommand(msg.chat.id, 'quote');
  const quote = getRandomItem(quotes);
  bot.sendMessage(msg.chat.id, `💡 خاطرة\n\n"${quote.quote}"\n\n✒️ ${quote.author}`);
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

bot.onText(/\/friday_test/, async (msg) => {
  const userId = msg.from.id;
  if (ADMIN_ID && userId.toString() !== ADMIN_ID.toString()) return;

  await sendFridayReminder(msg.chat.id, 'salawat');
  await sendFridayReminder(msg.chat.id, 'kahf');
  await sendFridayReminder(msg.chat.id, 'hourOfResponse');
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
  bot.sendMessage(msg.chat.id, formatMorningAthkar());
});

bot.onText(/\/evening/, (msg) => {
  let message = `🌙 أذكار المساء\n━━━━━━━━━━━━━━━━\n\n`;
  const selectedAthkar = eveningAthkar.slice(0, 3);
  selectedAthkar.forEach((thikr, index) => {
    message += `${index + 1}. ${thikr.text}\n   📖 ${thikr.count}\n\n`;
  });
  message += `━━━━━━━━━━━━━━━━\n🤲 اللهم بارك لنا في ليلتنا`;
  bot.sendMessage(msg.chat.id, message);
});

bot.onText(/\/chatid/, (msg) => {
  bot.sendMessage(msg.chat.id, `📍 Chat ID: \`${msg.chat.id}\``, { parse_mode: 'Markdown' });
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
  sendFridayReminder,
  Video,
  pendingPromises
};
