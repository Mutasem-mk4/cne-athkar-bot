const https = require('https');

/**
 * Helper to make HTTPS GET requests
 */
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'CNE-Athkar-Bot (https://github.com/Mutasem-mk4/cne-athkar-bot)'
            },
            timeout: 5000
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    reject(new Error(`JSON Parse Error: ${e.message}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        }).on('timeout', () => {
            reject(new Error('Request Timeout'));
        });
    });
}

/**
 * Fetches prayer times from Aladhan API
 */
async function getFromAladhan() {
    const url = 'https://api.aladhan.com/v1/timingsByCity?city=Amman&country=Jordan&method=4';
    const res = await fetchJson(url);
    if (res.status === 200 && res.data && res.data.data && res.data.data.timings) {
        return res.data.data.timings;
    }
    throw new Error(`Aladhan failed with status ${res.status}`);
}

/**
 * Fetches prayer times from PrayerTimes.date API (Fallback)
 */
async function getFromPrayerTimesDate() {
    const url = 'https://api.prayertimes.date/en/v1/today.json?city=amman';
    const res = await fetchJson(url);
    if (res.status === 200 && res.data && res.data.results && res.data.results.datetime && res.data.results.datetime[0]) {
        const t = res.data.results.datetime[0].times;
        return {
            Fajr: t.Fajr,
            Sunrise: t.Sunrise,
            Dhuhr: t.Dhuhr,
            Asr: t.Asr,
            Maghrib: t.Maghrib,
            Isha: t.Isha
        };
    }
    throw new Error(`PrayerTimes.date failed with status ${res.status}`);
}

/**
 * Main function with fallback logic
 */
async function getAmmanPrayerTimes() {
    try {
        console.log('Attempting to fetch from Aladhan...');
        return await getFromAladhan();
    } catch (err) {
        console.error('Aladhan failed, trying fallback:', err.message);
        try {
            return await getFromPrayerTimesDate();
        } catch (fallbackErr) {
            console.error('Fallback also failed:', fallbackErr.message);
            throw fallbackErr;
        }
    }
}

module.exports = { getAmmanPrayerTimes };
