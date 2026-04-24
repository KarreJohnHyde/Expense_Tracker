const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore Deno is injected at runtime
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, provider = 'whatsapp', to, message } = body;

    if (!to || !message) {
       throw new Error("Missing 'to' or 'message' parameters for integration gateway.");
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
       throw new Error("Missing Twilio credentials (TWILIO_ACCOUNT_SID, etc) in environment.");
    }

    // Format numbers based on provider
    const formattedFrom = provider === 'whatsapp' && !TWILIO_PHONE_NUMBER.startsWith('whatsapp:') 
      ? `whatsapp:${TWILIO_PHONE_NUMBER}` 
      : TWILIO_PHONE_NUMBER;
      
    const formattedTo = provider === 'whatsapp' && !to.startsWith('whatsapp:')
      ? `whatsapp:${to}`
      : to;

    const encodedParams = new URLSearchParams();
    encodedParams.append('To', formattedTo);
    encodedParams.append('From', formattedFrom);
    encodedParams.append('Body', message);

    const token = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    console.log(`[INTEGRATIONS] Dispatching physical request to Twilio...`);
    const resp = await fetch(twilioUrl, {
       method: 'POST',
       headers: {
         'Authorization': `Basic ${token}`,
         'Content-Type': 'application/x-www-form-urlencoded'
       },
       body: encodedParams.toString()
    });

    const respData = await resp.json();

    if (!resp.ok) {
        throw new Error(`Twilio rejected the request: ${respData.message || resp.statusText}`);
    }

    return new Response(
      JSON.stringify({ 
         success: true, 
         provider,
         status: 'delivered',
         message: `Message dispatched successfully to ${to} via ${provider}`,
         sid: respData.sid
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    console.error("Messaging Integration Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
