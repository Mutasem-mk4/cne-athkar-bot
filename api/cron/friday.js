const { sendFridayReminder, pendingPromises } = require('../../bot');

module.exports = async (req, res) => {
    try {
        const now = new Date();
        const hour = now.getUTCHours();
        const day = now.getUTCDay(); // 5 = Friday

        // Check if it's Friday in UTC (it overlaps with Amman Friday)
        if (day !== 5) {
            return res.status(200).json({ status: 'skipped', message: 'Not Friday UTC' });
        }

        console.log(`📅 Friday Cron triggered at ${hour} UTC`);

        // 06:00 UTC -> 9:00 AM Amman (Salawat)
        if (hour === 6) {
            console.log('Sending Salawat reminder...');
            await sendFridayReminder(undefined, 'salawat');
        }
        // 08:00 UTC -> 11:00 AM Amman (Kahf)
        else if (hour === 8) {
            console.log('Sending Kahf reminder...');
            await sendFridayReminder(undefined, 'kahf');
        }
        // 13:00 UTC -> 4:00 PM Amman (Hour of Response)
        else if (hour === 13) {
            console.log('Sending Hour of Response reminder...');
            await sendFridayReminder(undefined, 'hourOfResponse');
        } else {
            return res.status(200).json({ status: 'success', message: 'No Friday task for this hour' });
        }

        if (pendingPromises && pendingPromises.length > 0) {
            await Promise.all(pendingPromises);
        }

        res.status(200).json({ status: 'success', hour });
    } catch (error) {
        console.error('Friday Cron Error:', error);
        res.status(500).json({ error: error.message });
    }
};
