const https = require('https');

/**
 * Fetches prayer times for Amman, Jordan
 * @returns {Promise<Object>} Prayer times object
 */
async function getAmmanPrayerTimes() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.aladhan.com/v1/timingsByCity?city=Amman&country=Jordan&method=4'; // Method 4 = Umm Al-Qura

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.code === 200) {
                        resolve(json.data.timings);
                    } else {
                        reject(new Error('Failed to fetch prayer times'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = { getAmmanPrayerTimes };
