// api/calendar.js
// Vercel Serverless Function para sincronizar calendario de Airbnb

export default async function handler(req, res) {
    // Encabezados CORS para permitir peticiones desde cualquier origen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Caché en borde de 5 minutos (300 seg) para no saturar a Airbnb
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const AIRBNB_ICAL_URL = 'https://www.airbnb.com.co/calendar/ical/1690560560597219596.ics?t=35470803cbb94d65a69e3c02dfbe7645';

    try {
        const response = await fetch(AIRBNB_ICAL_URL, {
            headers: {
                'User-Agent': 'VillaIlusion-CalendarSync/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Airbnb iCal HTTP error ${response.status}`);
        }

        const icsText = await response.text();

        const blockedRanges = [];
        const eventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
        let match;

        while ((match = eventRegex.exec(icsText)) !== null) {
            const eventText = match[0];
            const startMatch = eventText.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
            const endMatch = eventText.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);

            if (startMatch && endMatch) {
                const s = startMatch[1];
                const e = endMatch[1];
                const from = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
                const to = `${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}`;
                blockedRanges.push({ from, to });
            }
        }

        return res.status(200).json({
            success: true,
            updatedAt: new Date().toISOString(),
            totalBlockedEvents: blockedRanges.length,
            blockedRanges
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
