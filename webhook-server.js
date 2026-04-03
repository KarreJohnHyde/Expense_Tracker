import express from 'express';
import cors from 'cors';
import localtunnel from 'localtunnel';

const app = express();
const port = 3001;
let publicUrl = `http://localhost:${port}`;

app.use(cors());
app.use(express.json());

// Endpoint for frontend to retrieve the active internet URL
app.get('/api/webhook-info', (req, res) => {
  res.json({ url: publicUrl });
});

// The SMS Sync webhook endpoint designed to receive payloads
app.post('/v1/webhooks/sms-sync', (req, res) => {
  const token = req.query.token;
  const payload = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Missing security token' });
  }

  console.log('\n--- 🚀 NEW WEBHOOK RECEIVED ---');
  console.log(`Token: ${token}`);
  console.log(`Payload:`, payload);
  console.log('--------------------------------\n');

  // Typically we would import SMSParser here and process the payload.text
  // then dump it into a database like Supabase JSON block.
  
  res.status(200).json({ success: true, message: 'SMS received and logged successfully' });
});

app.listen(port, async () => {
  console.log(`\nLocal webhook server listening at http://localhost:${port}`);
  
  try {
    const tunnel = await localtunnel({ port: port });
    publicUrl = tunnel.url;
    console.log(`\n======================================================`);
    console.log(`🌍 PUBLIC INTERNET TUNNEL ESTABLISHED 🌍`);
    console.log(`Endpoint: ${publicUrl}/v1/webhooks/sms-sync`);
    console.log(`======================================================\n`);
    
    tunnel.on('close', () => {
      console.log('Tunnel closed.');
    });
  } catch (err) {
    console.error('Failed to establish localtunnel:', err);
  }
});
