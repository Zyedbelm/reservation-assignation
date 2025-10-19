import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Content-Type': 'text/calendar; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

interface Activity {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  assigned_gm_id?: string;
  game_masters?: {
    first_name?: string;
    last_name?: string;
    name?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const method = req.method;
  const userAgent = req.headers.get('user-agent') || 'unknown';
  console.log(`[${requestId}] Admin iCal feed request started - method=${method} ua=${userAgent}`);

  if (method === 'HEAD') {
    console.log(`[${requestId}] HEAD request - returning headers only`);
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Disposition': 'inline; filename="planning-general.ics"',
      },
    });
  }

  if (method !== 'GET') {
    console.log(`[${requestId}] Unsupported method: ${method}`);
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL activities from today onwards (assigned and unassigned) with GM info
    const today = new Date().toISOString().split('T')[0];
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        date,
        start_time,
        end_time,
        title,
        description,
        assigned_gm_id,
        game_masters:assigned_gm_id (
          first_name,
          last_name,
          name
        )
      `)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error(`[${requestId}] Database error:`, error);
      return new Response(
        JSON.stringify({ error: 'Database error', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Found ${activities?.length || 0} activities`);

    // Generate iCal content
    const iCalContent = generateSimpleICalContent(activities || [], requestId);

    return new Response(iCalContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Disposition': 'inline; filename="planning-general.ics"',
      },
    });

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateSimpleICalContent(activities: Activity[], requestId: string): string {
  console.log(`[${requestId}] Generating iCal with ${activities.length} activities`);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Helper functions identiques à gm-ical-feed
  const formatLocalDate = (dateStr: string, timeStr: string) => {
    return dateStr.replace(/-/g, '') + 'T' + timeStr.replace(/:/g, '');
  };

  const escapeText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n');
  };

  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planning Général//Admin Calendar//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Planning Général - Admin',
    'X-WR-TIMEZONE:Europe/Zurich',
    'X-WR-CALDESC:Tous les événements assignés du planning général',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Zurich',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  let validEvents = 0;

  activities.forEach((activity, index) => {
    try {
      console.log(`[${requestId}] Processing event ${index + 1}: ${activity.title}`);
      
      if (!activity.date || !activity.start_time || !activity.end_time) {
        console.log(`[${requestId}] Skipping event with missing date/time data`);
        return;
      }

      const startDateFormatted = formatLocalDate(activity.date, activity.start_time);
      const endDateFormatted = formatLocalDate(activity.date, activity.end_time);
      
      // Format GM name for display
      let gmName = '';
      if (activity.assigned_gm_id && activity.game_masters) {
        const gm = activity.game_masters;
        if (gm.first_name && gm.last_name) {
          gmName = `${gm.first_name} ${gm.last_name}`;
        } else if (gm.first_name) {
          gmName = gm.first_name;
        } else if (gm.last_name) {
          gmName = gm.last_name;
        } else if (gm.name && !gm.name.includes('@')) {
          gmName = gm.name;
        }
      }
      
      // Add GM name or "Non assigné" to title
      const titleWithGM = activity.assigned_gm_id
        ? (gmName 
            ? `${activity.title || 'Sans titre'} - GM: ${gmName}`
            : `${activity.title || 'Sans titre'} - GM assigné`)
        : `${activity.title || 'Sans titre'} - Non assigné`;
      
      console.log(`[${requestId}] Event ${index + 1} times - Start: ${startDateFormatted}, End: ${endDateFormatted}, GM: ${gmName || 'none'}`);

      const event = [
        'BEGIN:VEVENT',
        `UID:${activity.id}@planning-admin`,
        `DTSTART;TZID=Europe/Zurich:${startDateFormatted}`,
        `DTEND;TZID=Europe/Zurich:${endDateFormatted}`,
        `DTSTAMP:${timestamp}`,
        `SUMMARY:${escapeText(titleWithGM)}`,
        activity.description ? `DESCRIPTION:${escapeText(activity.description)}` : null,
        `LOCATION:Génie Culturel - Sion`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].filter(line => line !== null);

      icalContent = icalContent.concat(event);
      validEvents++;
      
    } catch (error) {
      console.error(`[${requestId}] Error processing activity ${activity.id}:`, error);
    }
  });

  icalContent.push('END:VCALENDAR');
  
  console.log(`[${requestId}] Generated iCal with ${validEvents} valid events out of ${activities.length} activities`);

  return icalContent.join('\r\n');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}
