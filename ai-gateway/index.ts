import dotenv from 'dotenv';
import { streamText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error('Missing AI_GATEWAY_API_KEY in .env.local.');
  process.exit(1);
}

const modelId = process.env.AI_GATEWAY_MODEL ?? 'openai/gpt-5.4';
const prompt =
  process.argv.slice(2).join(' ') ||
  'Write a concise, friendly summary of what AI gateways are used for.';

const gateway = createGateway({ apiKey });

try {
  const result = await streamText({
    model: gateway(modelId),
    prompt
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  const usage = await result.usage;
  console.log('\n\nToken usage:', usage);
} catch (error) {
  console.error('\nStream failed:', error);
  process.exit(1);
}
