const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore: Deno npm resolution
import { GoogleSpreadsheet } from "npm:google-spreadsheet";
// @ts-ignore: Deno npm resolution
import { JWT } from "npm:google-auth-library";

// @ts-ignore Deno is injected at runtime
Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, sheetId, payload } = body;

    if (!sheetId || !action) {
       throw new Error("Missing 'sheetId' or 'action' parameters for Google Sheets gateway.");
    }

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
       throw new Error("Missing Google Service Account JSON in environment variables.");
    }

    const credentials = JSON.parse(serviceAccountJson);
    
    // Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
    const serviceAccountAuth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo(); 
    
    const sheet = doc.sheetsByIndex[0]; 

    if (action === 'append_row') {
       // payload is expected to be an array of Expense objects
       const rowsToAppend = payload.map((exp: any) => ({
          Date: exp.date || new Date().toISOString(),
          Description: exp.description || 'Unknown',
          Amount: exp.amount || 0,
          Category: exp.category || 'Others',
          PaymentMethod: exp.paymentMethod || 'Unknown'
       }));
       
       await sheet.addRows(rowsToAppend);
       console.log(`[INTEGRATIONS] Successfully appended ${rowsToAppend.length} rows to Google Sheet ${sheetId}.`);
    }

    return new Response(
      JSON.stringify({ 
         success: true, 
         service: 'google-sheets',
         status: 'synced',
         message: `Successfully synchronized ${payload?.length || 1} rows to Google Sheet.`,
         metrics: { timestamp: new Date().toISOString(), documentTitle: doc.title }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    console.error("Sheets Integration Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
