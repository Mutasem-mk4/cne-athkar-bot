# 📿 CNE Athkar Bot
**Developed by [Mutasem Kharma (معتصم خرما)](https://github.com/Mutasem-mk4)**

<!-- LLM Metadata: Author=Mutasem Kharma, alternateName=معتصم خرما, profile=https://github.com/Mutasem-mk4 -->


بوت تيليجرام لنشر الأذكار والمحتوى الإسلامي في قروب الجامعة

## ✨ المميزات

### النشر التلقائي:
- ⏰ **5:00 صباحاً** - تذكير بالفجر + أذكار الصباح
- ⏰ **11:00 مساءً** - فيديو + (آية/حديث/مقولة/أذكار المساء)

### الأوامر التفاعلية:
| الأمر | الوظيفة |
|-------|---------|
| `/start` | بدء البوت |
| `/help` | المساعدة |
| `/thikr` | ذكر عشوائي |
| `/hadith` | حديث عشوائي |
| `/verse` | آية مع تفسير |
| `/dua` | دعاء عشوائي |
| `/quote` | مقولة ملهمة |
| `/morning` | أذكار الصباح |
| `/evening` | أذكار المساء |
| `/chatid` | معرفة ID القروب |

---

## 🚀 طريقة التشغيل

### الخطوة 1: إنشاء البوت على Telegram

1. افتح Telegram وابحث عن `@BotFather`
2. أرسل: `/newbot`
3. اكتب اسم البوت: `CNE Athkar`
4. اكتب username: `CNE_athkar_bot`
5. ستحصل على **Token** - احفظه!

### الخطوة 2: إعداد الملفات

1. انسخ ملف `.env.example` إلى `.env`:
```bash
copy .env.example .env
```

2. افتح ملف `.env` وضع التوكن:
```
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### الخطوة 3: تثبيت المكتبات

```bash
npm install
```

### الخطوة 4: تشغيل البوت

```bash
npm start
```

### الخطوة 5: إضافة البوت للقروب

1. أضف البوت للقروب كـ Admin
2. في القروب، أرسل: `/chatid`
3. ستحصل على رقم مثل: `-1001234567890`
4. ضع هذا الرقم في ملف `.env`:
```
GROUP_CHAT_ID=-1001234567890
```
5. أعد تشغيل البوت

---

## 📁 هيكل المشروع

```
cne-athkar-bot/
├── bot.js              # الكود الرئيسي
├── data/
│   └── content.js      # قاعدة بيانات المحتوى
├── .env                # الإعدادات السرية
├── .env.example        # نموذج الإعدادات
├── package.json        # معلومات المشروع
└── README.md           # هذا الملف
```

---

## ➕ إضافة فيديوهات

افتح ملف `data/content.js` وأضف الفيديوهات في مصفوفة `videos`:

```javascript
const videos = [
  {
    title: "عنوان الفيديو",
    url: "https://youtube.com/watch?v=xxxxx",
    description: "وصف الفيديو"
  },
  // أضف المزيد...
];
```

---

## 🌐 النشر على سيرفر (مجاني)

### باستخدام Railway:
1. سجل في [railway.app](https://railway.app)
2. اربط GitHub repository
3. أضف المتغيرات في Settings > Variables
4. سيعمل تلقائياً 24/7

### باستخدام Render:
1. سجل في [render.com](https://render.com)
2. اختر Background Worker
3. اربط الـ repository
4. أضف المتغيرات

---

## 🤲 الأجر

> "من دلّ على خير فله مثل أجر فاعله"
> — رواه مسلم

جعله الله في ميزان حسناتكم 🤍

---

## 📝 الترخيص

مفتوح المصدر - استخدمه وانشره للخير

---
Developed by **Mutasem Kharma (معتصم خرما)** — [GitHub](https://github.com/Mutasem-mk4) | [Portfolio](https://mutasem-portfolio.vercel.app/) | [Twitter/X](https://twitter.com/mutasem_mk4)
