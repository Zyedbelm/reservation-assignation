
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'text/calendar; charset=utf-8',
  'Content-Disposition': 'attachment; filename="planning-gm.ics"',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

interface Activity {
  id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  activity_type: string;
  duration: number;
  assigned_gm_id: string;
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] REQUEST START: ${req.method} ${req.url}`);
  console.log(`🚀 [${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));
  console.log(`🚀 [${requestId}] User-Agent:`, req.headers.get('user-agent'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight handled`);
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log(`❌ [${requestId}] Method not allowed: ${req.method}`);
    return new Response('Method not allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }

  try {
    const url = new URL(req.url);
    const gmId = url.searchParams.get('gm_id');
    console.log(`📋 [${requestId}] Processing GM ID: ${gmId}`);

    if (!gmId) {
      console.log(`❌ [${requestId}] Missing GM ID parameter`);
      return new Response('GM ID parameter is required', { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Validate GM ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(gmId)) {
      console.log(`❌ [${requestId}] Invalid GM ID format: ${gmId}`);
      return new Response('Invalid GM ID format', { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log(`🔧 [${requestId}] Supabase config check:`);
    console.log(`🔧 [${requestId}] - URL: ${supabaseUrl ? 'OK' : 'MISSING'}`);
    console.log(`🔧 [${requestId}] - Service Key: ${supabaseKey ? 'OK' : 'MISSING'}`);
    
    if (!supabaseUrl || !supabaseKey) {
      console.log(`❌ [${requestId}] Missing Supabase configuration`);
      return new Response('Server configuration error', { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`✅ [${requestId}] Supabase client initialized`);

    // Test database connection first
    console.log(`🔍 [${requestId}] Testing database connection...`);
    const { data: testData, error: testError } = await supabase
      .from('activities')
      .select('count')
      .limit(1)
      .single();

    if (testError) {
      console.log(`❌ [${requestId}] Database connection failed:`, testError);
      return new Response('Database connection error', { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    console.log(`✅ [${requestId}] Database connection successful`);

    // Fetch GM info first
    console.log(`🔍 [${requestId}] Fetching GM info...`);
    const { data: gmData, error: gmError } = await supabase
      .from('game_masters')
      .select('name, first_name, last_name')
      .eq('id', gmId)
      .maybeSingle();

    if (gmError) {
      console.log(`❌ [${requestId}] GM lookup error:`, gmError);
      return new Response('GM lookup error', { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    if (!gmData) {
      console.log(`❌ [${requestId}] GM not found: ${gmId}`);
      return new Response('GM not found', { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    const gmName = gmData.name || 
                   `${gmData.first_name || ''} ${gmData.last_name || ''}`.trim() || 
                   `GM-${gmId.substring(0, 8)}`;

    console.log(`👤 [${requestId}] GM found: ${gmName}`);

    // Fetch activities with timeout
    console.log(`🔍 [${requestId}] Fetching activities...`);
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title, description, date, start_time, end_time, activity_type, duration, assigned_gm_id')
      .eq('assigned_gm_id', gmId)
      .eq('is_assigned', true)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future events
      .order('date', { ascending: true })
      .limit(10); // Reduced limit for testing

    if (activitiesError) {
      console.log(`❌ [${requestId}] Activities query error:`, activitiesError);
      return new Response('Activities query error', { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    console.log(`📊 [${requestId}] Found ${activities?.length || 0} activities`);

    // Generate iCal content
    const icalContent = generateSimpleICalContent(activities || [], gmName, requestId);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Success! Processing time: ${processingTime}ms`);
    console.log(`📝 [${requestId}] iCal content length: ${icalContent.length} chars`);

    return new Response(icalContent, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.log(`💥 [${requestId}] Fatal error after ${processingTime}ms:`, error);
    console.log(`💥 [${requestId}] Error details:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response('Internal server error', { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }
});

function generateSimpleICalContent(activities: Activity[], gmName: string, requestId: string): string {
  console.log(`🔨 [${requestId}] Generating iCal for ${activities.length} activities`);
  
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Genie Culturel//GM Calendar//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Planning GM - ${gmName}`,
    'X-WR-CALDESC:Planning des événements - Génie Culturel',
    'X-WR-TIMEZONE:Europe/Zurich',
    // Ajouter la définition du fuseau horaire Europe/Zurich
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
      console.log(`📅 [${requestId}] Processing event ${index + 1}: ${activity.title}`);
      
      // Simple date validation
      if (!activity.date || !activity.start_time || !activity.end_time) {
        console.log(`⚠️ [${requestId}] Skipping event with missing date/time data`);
        return;
      }
      
      // Formater les dates en heure locale (Europe/Zurich) sans conversion UTC
      const formatLocalDate = (dateStr: string, timeStr: string) => {
        // Format: 20251004T103000 (sans Z pour indiquer l'heure locale)
        return dateStr.replace(/-/g, '') + 'T' + timeStr.replace(/:/g, '');
      };
      
      const startDateFormatted = formatLocalDate(activity.date, activity.start_time);
      const endDateFormatted = formatLocalDate(activity.date, activity.end_time);
      
      console.log(`🕐 [${requestId}] Event times - Start: ${startDateFormatted}, End: ${endDateFormatted}`);

      // Simple text escaping
      const escapeText = (text: string) => {
        if (!text) return '';
        return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
      };

      const event = [
        'BEGIN:VEVENT',
        `UID:gm-${activity.id}@genieculturel.ch`,
        `DTSTART;TZID=Europe/Zurich:${startDateFormatted}`,
        `DTEND;TZID=Europe/Zurich:${endDateFormatted}`,
        `DTSTAMP:${timestamp}`,
        `SUMMARY:${escapeText(activity.title)}`,
        `DESCRIPTION:${escapeText(activity.description || '')}`,
        `LOCATION:Sion Centre`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ];

      icalContent = icalContent.concat(event);
      validEvents++;
      
    } catch (eventError) {
      console.log(`❌ [${requestId}] Error processing event ${activity.id}:`, eventError);
    }
  });

  icalContent.push('END:VCALENDAR');
  
  console.log(`✅ [${requestId}] Generated iCal with ${validEvents} valid events`);
  
  return icalContent.join('\r\n');
}
