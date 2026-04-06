import dotenv from 'dotenv';
import ngrok from '@ngrok/ngrok';

dotenv.config();

const port = Number.parseInt(process.env.VITE_DEV_PORT || '5173', 10);
const authtoken = process.env.NGROK_AUTHTOKEN;

if (!authtoken) {
  console.error('NGROK_AUTHTOKEN is missing in .env. Add it to enable public HTTPS.');
  process.exit(1);
}

async function startTunnel() {
  try {
    const listener = await ngrok.forward({ addr: port, authtoken });
    const url = listener.url();
    console.log('\n======================================================');
    console.log('🌍 PUBLIC HTTPS TUNNEL ACTIVE');
    console.log(`App URL: ${url}`);
    console.log(`Local dev server: http://localhost:${port}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Failed to establish ngrok tunnel:', err.message || err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  try { await ngrok.kill(); } catch {}
  process.exit(0);
});

await startTunnel();
