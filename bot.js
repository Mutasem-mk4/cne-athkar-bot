// ==========================================
// 🤖 CNE Athkar Bot - بوت أذكار الجامعة
// ==========================================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const {
  morningAthkar,
  eveningAthkar,
  verses,
  hadiths,
  quotes,
  duas,
  videos
} = require('./data/content');
const fs = require('fs');
const VIDEOS_DB = './data/videos.json';

// ==========================================
// 📌 الإعدادات
// ==========================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('❌ خطأ: لم يتم تعيين BOT_TOKEN في ملف .env');
  process.exit(1);
}

// إنشاء البوت
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('✅ البوت يعمل الآن...');
console.log('📿 CNE Athkar Bot');

// ==========================================
// 🛠️ دوال مساعدة
// ==========================================

// اختيار عنصر عشوائي من مصفوفة
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// تنسيق أذكار الصباح
function formatMorningAthkar() {
  let message = `🌅 صباح الخير\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;
  message += `🕌 حان وقت صلاة الفجر\n`;
  message += `لا تنسوا الصلاة في وقتها\n\n`;
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `📿 أذكار الصباح\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;

  // اختر 3 أذكار عشوائية (لتقليل طول الرسالة)
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

// تنسيق المحتوى المسائي
function formatEveningContent() {
  // اختيار نوع المحتوى عشوائياً
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
// ⏰ النشر التلقائي (Cron Jobs)
// ==========================================

// النشر الصباحي - الساعة 5:00 صباحاً
cron.schedule('0 5 * * *', async () => {
  if (!GROUP_CHAT_ID) {
    console.log('⚠️ لم يتم تعيين GROUP_CHAT_ID');
    return;
  }

  try {
    const message = formatMorningAthkar();
    await bot.sendMessage(GROUP_CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log('✅ تم إرسال أذكار الصباح');
  } catch (error) {
    console.error('❌ خطأ في إرسال أذكار الصباح:', error.message);
  }
}, {
  timezone: process.env.TIMEZONE || 'Asia/Amman'
});

// النشر المسائي - الساعة 11:00 مساءً
cron.schedule('0 23 * * *', async () => {
  if (!GROUP_CHAT_ID) {
    console.log('⚠️ لم يتم تعيين GROUP_CHAT_ID');
    return;
  }

  try {
    // أولاً: إرسال الفيديو (إذا موجود)
    if (videos.length > 0) {
      const video = getRandomItem(videos);
      const videoMessage = `🎬 *فيديو اليوم*\n\n${video.title}\n\n${video.url}`;
      await bot.sendMessage(GROUP_CHAT_ID, videoMessage, { parse_mode: 'Markdown' });
    }

    // ثانياً: إرسال المحتوى (آية/حديث/مقولة...)
    const message = formatEveningContent();
    await bot.sendMessage(GROUP_CHAT_ID, message, { parse_mode: 'Markdown' });

    console.log('✅ تم إرسال محتوى المساء');
  } catch (error) {
    console.error('❌ خطأ في إرسال محتوى المساء:', error.message);
  }
}, {
  timezone: process.env.TIMEZONE || 'Asia/Amman'
});

// إعادة توجيه آخر فيديو من قناة @islamic_clips إلى القروب كل يوم الساعة 11 مساءً
const SOURCE_CHANNEL = '@islamic_clips';

cron.schedule('0 23 * * *', async () => {
  if (!GROUP_CHAT_ID) {
    console.log('⚠️ لم يتم تعيين GROUP_CHAT_ID');
    return;
  }

  try {
    // جلب آخر 10 رسائل من القناة
    const updates = await bot.getChatHistory(SOURCE_CHANNEL, { limit: 10 });
    // ابحث عن أول رسالة تحتوي على فيديو
    const lastVideoMsg = updates.find(msg => msg.video);
    if (lastVideoMsg) {
      await bot.forwardMessage(GROUP_CHAT_ID, SOURCE_CHANNEL, lastVideoMsg.message_id);
      console.log('✅ تم إعادة توجيه فيديو من القناة');
    } else {
      console.log('❌ لم يتم العثور على فيديو في آخر 10 رسائل');
    }
  } catch (error) {
    console.error('❌ خطأ في إعادة توجيه فيديو من القناة:', error.message);
  }
}, {
  timezone: process.env.TIMEZONE || 'Asia/Amman'
});

// ==========================================
// 💬 الأوامر التفاعلية
// ==========================================

// أمر البداية
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

━━━━━━━━━━━━━━━━
🤲 جعله الله في ميزان حسناتكم
  `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// أمر المساعدة
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📚 *دليل استخدام البوت*

*أوامر الأذكار:*
/thikr - ذكر عشوائي من أذكار الصباح والمساء
/morning - أذكار الصباح كاملة
/evening - أذكار المساء كاملة

*أوامر المحتوى:*
/hadith - حديث نبوي عشوائي
/verse - آية قرآنية مع تفسير
/dua - دعاء عشوائي
/quote - مقولة ملهمة

*النشر التلقائي:*
📅 الساعة 5:00 صباحاً - أذكار الصباح
📅 الساعة 11:00 مساءً - فيديو + محتوى

━━━━━━━━━━━━━━━━
💡 يمكنك استخدام الأوامر في الخاص أو في القروب
  `;
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// أمر ذكر عشوائي
bot.onText(/\/thikr/, (msg) => {
  const chatId = msg.chat.id;
  const allAthkar = [...morningAthkar, ...eveningAthkar];
  const thikr = getRandomItem(allAthkar);
  
  let message = `📿 *ذكر*\n\n`;
  message += `${thikr.text}\n\n`;
  message += `📖 _${thikr.count}_`;
  if (thikr.reward) {
    message += `\n\n✨ ${thikr.reward}`;
  }
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// أمر حديث عشوائي
bot.onText(/\/hadith/, (msg) => {
  const chatId = msg.chat.id;
  const hadith = getRandomItem(hadiths);
  
  let message = `📜 *حديث نبوي*\n\n`;
  message += `${hadith.hadith}\n\n`;
  message += `📍 _${hadith.narrator}_\n\n`;
  message += `💡 *الشرح:*\n${hadith.explanation}`;
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// أمر آية عشوائية
bot.onText(/\/verse/, (msg) => {
  const chatId = msg.chat.id;
  const verse = getRandomItem(verses);
  
  let message = `📖 *آية قرآنية*\n\n`;
  message += `${verse.verse}\n\n`;
  message += `📍 _${verse.surah}_\n\n`;
  message += `💡 *التفسير:*\n${verse.tafsir}`;
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// أمر دعاء عشوائي
bot.onText(/\/dua/, (msg) => {
  const chatId = msg.chat.id;
  const dua = getRandomItem(duas);
  
  const message = `🤲 *دعاء*\n\n${dua}`;
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// أمر مقولة
bot.onText(/\/quote/, (msg) => {
  const chatId = msg.chat.id;
  const quote = getRandomItem(quotes);
  
  let message = `💭 *مقولة*\n\n`;
  message += `${quote.quote}\n\n`;
  message += `— _${quote.author}_`;
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// أمر أذكار الصباح
bot.onText(/\/morning/, (msg) => {
  const chatId = msg.chat.id;
  const message = formatMorningAthkar();
  bot.sendMessage(chatId, message);
});

// أمر أذكار المساء
bot.onText(/\/evening/, (msg) => {
  const chatId = msg.chat.id;
  
  let message = `🌙 أذكار المساء\n`;
  message += `━━━━━━━━━━━━━━━━\n\n`;

  // اختر 3 أذكار فقط
  const selectedAthkar = eveningAthkar.slice(0, 3);
  selectedAthkar.forEach((thikr, index) => {
    message += `${index + 1}. ${thikr.text}\n`;
    message += `   📖 ${thikr.count}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━\n`;
  message += `🤲 اللهم بارك لنا في ليلتنا`;

  bot.sendMessage(chatId, message);
});

// أمر للحصول على Chat ID (للإعداد)
bot.onText(/\/chatid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `📍 Chat ID: \`${chatId}\``, { parse_mode: 'Markdown' });
});

// أمر اختبار النشر التلقائي
bot.onText(/\/test_morning/, (msg) => {
  const chatId = msg.chat.id;
  console.log('🧪 اختبار رسالة الصباح...');
  const message = formatMorningAthkar();
  bot.sendMessage(chatId, message);
  console.log('✅ تم إرسال رسالة الصباح التجريبية');
});

bot.onText(/\/test_evening/, (msg) => {
  const chatId = msg.chat.id;
  console.log('🧪 اختبار رسالة المساء...');
  const message = formatEveningContent();
  bot.sendMessage(chatId, message);
  console.log('✅ تم إرسال رسالة المساء التجريبية');
});

// أمر لعرض حالة البوت
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const now = new Date();
  const timezone = process.env.TIMEZONE || 'Asia/Amman';
  
  let status = `🤖 حالة البوت\n`;
  status += `━━━━━━━━━━━━━━━━\n\n`;
  status += `✅ البوت يعمل\n\n`;
  status += `⏰ الوقت الحالي: ${now.toLocaleTimeString('ar-EG')}\n`;
  status += `🌍 المنطقة الزمنية: ${timezone}\n\n`;
  status += `📅 مواعيد النشر:\n`;
  status += `   🌅 الصباح: 5:00 ص\n`;
  status += `   🌙 المساء: 11:00 م\n\n`;
  status += `📍 Group ID: ${process.env.GROUP_CHAT_ID || 'غير محدد'}\n`;
  
  bot.sendMessage(chatId, status);
});

// ==========================================
// 🔔 معالجة الأخطاء
// ==========================================

bot.on('polling_error', (error) => {
  console.error('❌ خطأ في الاتصال:', error.message);
});

// رسالة تأكيد التشغيل
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📿 CNE Athkar Bot is running!');
console.log('⏰ Morning post: 5:00 AM');
console.log('⏰ Evening post: 11:00 PM');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// تحميل قائمة الفيديوهات من ملف JSON
function loadVideosList() {
  try {
    if (fs.existsSync(VIDEOS_DB)) {
      return JSON.parse(fs.readFileSync(VIDEOS_DB, 'utf8'));
    }
  } catch (e) {}
  return [];
}

// حفظ قائمة الفيديوهات
function saveVideosList(list) {
  fs.writeFileSync(VIDEOS_DB, JSON.stringify(list, null, 2), 'utf8');
}

// استقبال فيديوهات في الخاص وتخزينها (سواء فورورد أو فيديو عادي)
bot.on('message', (msg) => {
  if (msg.chat.type === 'private' && msg.video) {
    let videosList = [];
    try {
      if (fs.existsSync(VIDEOS_DB)) {
        videosList = JSON.parse(fs.readFileSync(VIDEOS_DB, 'utf8'));
      }
    } catch (e) {}
    let entry;
    if (msg.forward_from_chat && msg.forward_from_message_id) {
      // فيديو فورورد
      entry = { chat_id: msg.forward_from_chat.id, message_id: msg.forward_from_message_id };
    } else {
      // فيديو عادي (مرسل من المستخدم نفسه)
      entry = { chat_id: msg.chat.id, message_id: msg.message_id };
    }
    // تحقق من عدم التكرار
    if (!videosList.find(v => v.chat_id === entry.chat_id && v.message_id === entry.message_id)) {
      videosList.push(entry);
      fs.writeFileSync(VIDEOS_DB, JSON.stringify(videosList, null, 2), 'utf8');
      bot.sendMessage(msg.chat.id, '✅ تم حفظ الفيديو لإرساله تلقائياً في القروب.');
    } else {
      bot.sendMessage(msg.chat.id, '⚠️ هذا الفيديو محفوظ مسبقاً.');
    }
  }
});

// إرسال فيديو عشوائي من القائمة الساعة 11 مساءً
cron.schedule('0 23 * * *', async () => {
  if (!GROUP_CHAT_ID) return;
  let videosList = loadVideosList();
  if (videosList.length === 0) {
    console.log('⚠️ لا يوجد فيديوهات محفوظة');
    return;
  }
  // اختر فيديو عشوائي
  const video = videosList[Math.floor(Math.random() * videosList.length)];
  try {
    await bot.forwardMessage(GROUP_CHAT_ID, video.chat_id, video.message_id);
    console.log('✅ تم إرسال فيديو محفوظ للقروب');
  } catch (e) {
    console.error('❌ خطأ في إرسال الفيديو:', e.message);
  }
}, {
  timezone: process.env.TIMEZONE || 'Asia/Amman'
});
