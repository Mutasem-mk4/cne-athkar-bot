/**
 * Fetches prayer times from Amman using built-in fetch (Node 18+)
 */

async function getFromAladhan() {
    const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Amman&country=Jordan&method=4', {
        headers: { 'User-Agent': 'CNE-Athkar-Bot' }
    });
    if (!response.ok) throw new Error(`Aladhan HTTP ${response.status}`);
    const json = await response.json();
    return json.data.timings;
}

async function getFromPrayerTimesDate() {
    const response = await fetch('https://api.prayertimes.date/en/v1/today.json?city=amman', {
        headers: { 'User-Agent': 'CNE-Athkar-Bot' }
    });
    if (!response.ok) throw new Error(`PrayerTimesDate HTTP ${response.status}`);
    const json = await response.json();
    const t = json.results.datetime[0].times;
    return {
        Fajr: t.Fajr,
        Sunrise: t.Sunrise,
        Dhuhr: t.Dhuhr,
        Asr: t.Asr,
        Maghrib: t.Maghrib,
        Isha: t.Isha
    };
}

// Third Option: MuslimSalat
async function getFromMuslimSalat() {
    const response = await fetch('https://muslimsalat.com/amman.json', {
        headers: { 'User-Agent': 'CNE-Athkar-Bot' }
    });
    if (!response.ok) throw new Error(`MuslimSalat HTTP ${response.status}`);
    const json = await response.json();
    const t = json.items[0];
    return {
        Fajr: t.fajr,
        Sunrise: t.shurooq,
        Dhuhr: t.dhuhr,
        Asr: t.asr,
        Maghrib: t.maghrib,
        Isha: t.isha
    };
}

async function getAmmanPrayerTimes() {
    const errors = [];

    try { return await getFromAladhan(); }
    catch (e) { errors.push(`Aladhan: ${e.message}`); }

    try { return await getFromPrayerTimesDate(); }
    catch (e) { errors.push(`PrayerTimes: ${e.message}`); }

    try { return await getFromMuslimSalat(); }
    catch (e) { errors.push(`MuslimSalat: ${e.message}`); }

    throw new Error(`All APIs failed: ${errors.join(' | ')}`);
}

module.exports = { getAmmanPrayerTimes };
