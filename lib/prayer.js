const https = require('https');

/**
 * Fetches prayer times for Amman, Jordan
 * @returns {Promise<Object>} Prayer times object
 */
async function getAmmanPrayerTimes() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.aladhan.com/v1/timingsByCity?city=Amman&country=Jordan&method=4';

        const options = {
            headers: {
                'User-Agent': 'CNE-Athkar-Bot (https://github.com/Mutasem-mk4/cne-athkar-bot)'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.code === 200 && json.data && json.data.timings) {
                        resolve(json.data.timings);
                    } else {
                        console.error('API Error Response:', data);
                        reject(new Error(`API Error: ${json.code || 'Unknown'}`));
                    }
                } catch (e) {
                    console.error('JSON Parse Error:', data.substring(0, 100));
                    reject(e);
                }
            });
        }).on('error', (err) => {
            console.error('HTTPS Get Error:', err.message);
            reject(err);
        });
    });
}

module.exports = { getAmmanPrayerTimes };
