// ==========================================
// 🤖 CNE Athkar Bot - بوت أذكار الجامعة
// ==========================================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const connectDB = require('./lib/db');
const Video = require('./models/Video');
const {
  morningAthkar,
  eveningAthkar,
  verses,
  hadiths,
  quotes,
  duas,
  videos
} = require('./data/content');

// ==========================================
// 📌 الإعدادات
// ==========================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
const TIMEZONE = process.env.TIMEZONE || 'Asia/Amman';

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

// تنسيق أذكار الصباح
function formatMorningAthkar() {
  let message = `🌅 صباح الخير\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;
  message += `🕌 حان وقت صلاة الفجر\n`;
  message += `لا تنسوا الصلاة في وقتها\n\n`;
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `📿 أذكار الصباح\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;

  const selectedAthkar = [];
  const shuffled = [...morningAthkar].sort(() => 0.5 - Math.random());
  for (let i = 0; i < Math.min(3, shuffled.length); i++) {
    selectedAthkar.push(shuffled[i]);
  }

  selectedAthkar.forEach((thikr, index) => {
    message += `${index + 1}. ${thikr.text}\n`;
    message += `   📖 ${thikr.count}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━\n`;
  message += `🤲 اللهم بارك لنا في يومنا\n`;
  message += `\n#أذكار_الصباح #CNE`;

  return message;
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatEveningContent() {
  const contentTypes = ['verse', 'hadith', 'quote', 'evening_athkar', 'dua'];
  const selectedType = getRandomItem(contentTypes);

  let message = `🌙 *مساء الخير*\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;

  switch (selectedType) {
    case 'verse':
      const verse = getRandomItem(verses);
      message += `📖 *آية اليوم*\n\n`;
      message += `${verse.verse}\n\n`;
      message += `📍 _${verse.surah}_\n\n`;
      message += `💡 *التفسير:*\n${verse.tafsir}`;
      break;

    case 'hadith':
      const hadith = getRandomItem(hadiths);
      message += `📜 *حديث اليوم*\n\n`;
      message += `${hadith.hadith}\n\n`;
      message += `📍 _${hadith.narrator}_\n\n`;
      message += `💡 *الشرح:*\n${hadith.explanation}`;
      break;

    case 'quote':
      const quote = getRandomItem(quotes);
      message += `💭 *مقولة اليوم*\n\n`;
      message += `${quote.quote}\n\n`;
      message += `— _${quote.author}_`;
      break;

    case 'evening_athkar':
      message += `📿 *أذكار المساء*\n\n`;
      const selectedEveningAthkar = [];
      const shuffled = [...eveningAthkar].sort(() => 0.5 - Math.random());
      for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        selectedEveningAthkar.push(shuffled[i]);
      }
      selectedEveningAthkar.forEach((thikr, index) => {
        message += `*${index + 1}.* ${thikr.text}\n`;
        message += `   📖 _${thikr.count}_\n\n`;
      });
      break;

    case 'dua':
      const dua = getRandomItem(duas);
      message += `🤲 *دعاء اليوم*\n\n`;
      message += `${dua}`;
      break;
  }

  message += `\n\n━━━━━━━━━━━━━━━━\n`;
  message += `🌟 طابت ليلتكم بذكر الله\n`;
  message += `\n#CNE`;

  return message;
}

// ==========================================
// 📤 دوال النشر (Exported for Cron/API)
// ==========================================

const sendMorningMessage = async (targetChatId = GROUP_CHAT_ID) => {
  if (!targetChatId) {
    console.log('⚠️ لم يتم تعيين GROUP_CHAT_ID');
    return;
  }
  try {
    const message = formatMorningAthkar();
    await bot.sendMessage(targetChatId, message, { parse_mode: 'Markdown' });
    console.log('✅ تم إرسال أذكار الصباح');
  } catch (error) {
    console.error('❌ خطأ في إرسال أذكار الصباح:', error.message);
  }
};

const sendEveningMessage = async (targetChatId = GROUP_CHAT_ID) => {
  if (!targetChatId) {
    console.log('⚠️ لم يتم تعيين GROUP_CHAT_ID');
    return;
  }
  try {
    // 1. Send Video (from MongoDB or static list)
    await connectDB();
    const count = await Video.countDocuments();
    let video = null;

    if (count > 0) {
      const random = Math.floor(Math.random() * count);
      video = await Video.findOne().skip(random);
    }

    if (video) {
      try {
        // Using copyMessage to hide forward header
        await bot.copyMessage(targetChatId, video.chat_id, video.message_id);
        console.log('✅ تم إرسال فيديو محفوظ من قاعدة البيانات');
      } catch (e) {
        console.error('❌ خطأ في إرسال الفيديو المحفوظ:', e.message);
      }
    } else if (videos.length > 0) {
      // Fallback to static videos from content.js
      const staticVideo = getRandomItem(videos);
      const videoMessage = `🎬 *فيديو اليوم*\n\n${staticVideo.title}\n\n${staticVideo.url}`;
      await bot.sendMessage(targetChatId, videoMessage, { parse_mode: 'Markdown' });
    }

    // 2. Send Text Content
    const message = formatEveningContent();
    await bot.sendMessage(targetChatId, message, { parse_mode: 'Markdown' });

    console.log('✅ تم إرسال محتوى المساء');
  } catch (error) {
    console.error('❌ خطأ في إرسال محتوى المساء:', error.message);
  }
};

// ==========================================
// ⏰ النشر التلقائي والمحلي (Local Cron)
// ==========================================

if (isLocal) {
  cron.schedule('0 5 * * *', () => sendMorningMessage(), { timezone: TIMEZONE });
  cron.schedule('0 23 * * *', () => sendEveningMessage(), { timezone: TIMEZONE });
  console.log('⏰ Local Cron Jobs Scheduled');
}

// ==========================================
// 💬 الأوامر
// ==========================================

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🌟 *أهلاً بك في بوت CNE Athkar*
📿 بوت أذكار قروب الجامعة

*الأوامر المتاحة:*
/thikr - ذكر عشوائي
/hadith - حديث عشوائي
/verse - آية عشوائية
/dua - دعاء عشوائي
/morning - أذكار الصباح
/evening - أذكار المساء
/help - المساعدة
  `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const helpMessage = `📚 *دليل استخدام البوت*\n\n/thikr - ذكر\n/morning - أذكار الصباح\n/evening - أذكار المساء\n...`;
  bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/thikr/, (msg) => {
  const allAthkar = [...morningAthkar, ...eveningAthkar];
  const thikr = getRandomItem(allAthkar);
  bot.sendMessage(msg.chat.id, `📿 *ذكر*\n\n${thikr.text}\n\n📖 _${thikr.count}_`, { parse_mode: 'Markdown' });
});

bot.onText(/\/hadith/, (msg) => {
  const hadith = getRandomItem(hadiths);
  bot.sendMessage(msg.chat.id, `📜 *حديث*\n\n${hadith.hadith}\n\n📍 _${hadith.narrator}_\n\n💡 ${hadith.explanation}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/verse/, (msg) => {
  const verse = getRandomItem(verses);
  bot.sendMessage(msg.chat.id, `📖 *آية*\n\n${verse.verse}\n\n📍 _${verse.surah}_\n\n💡 ${verse.tafsir}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/dua/, (msg) => {
  const dua = getRandomItem(duas);
  bot.sendMessage(msg.chat.id, `🤲 *دعاء*\n\n${dua}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/quote/, (msg) => {
  const quote = getRandomItem(quotes);
  bot.sendMessage(msg.chat.id, `💭 *مقولة*\n\n${quote.quote}\n\n— _${quote.author}_`, { parse_mode: 'Markdown' });
});

bot.onText(/\/morning/, (msg) => {
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
  sendMorningMessage(msg.chat.id);
});

bot.onText(/\/test_evening/, async (msg) => {
  console.log('🧪 Testing Evening...');
  sendEveningMessage(msg.chat.id);
});

bot.onText(/\/status/, (msg) => {
  const now = new Date();
  let status = `🤖 حالة البوت\n━━━━━━━━━━━━━━━━\n`;
  status += `✅ البوت يعمل (${isLocal ? 'Local' : 'Serverless'})\n`;
  status += `⏰ الوقت: ${now.toLocaleTimeString('ar-EG')}\n`;
  status += `🗄️ التخزين: MongoDB\n`;
  bot.sendMessage(msg.chat.id, status);
});

// حفظ الفيديوهات من الخاص (MongoDB)
bot.on('message', async (msg) => {
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
  sendMorningMessage,
  sendEveningMessage,
  pendingPromises
};
