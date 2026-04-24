import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

import { handler } from './app.js';

function toLambdaEvent(req, bodyBuffer) {
  return {
    rawPath: req.url?.split('?')[0] || '/',
    rawQueryString: req.url?.split('?')[1] || '',
    requestContext: {
      http: {
        method: req.method || 'GET',
        sourceIp: req.socket.remoteAddress || '0.0.0.0',
      },
      requestId: randomUUID(),
    },
    headers: req.headers,
    body: bodyBuffer.toString('base64'),
    isBase64Encoded: true,
  };
}

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const lambdaEvent = toLambdaEvent(req, Buffer.concat(chunks));
  const response = await handler(lambdaEvent, { awsRequestId: randomUUID() });

  const headers = response.headers || { 'Content-Type': 'application/json' };
  res.writeHead(response.statusCode || 200, headers);
  res.end(response.body || '');
});

const port = Number(process.env.PORT || 8080);
server.listen(port, () => {
  console.log(`Cloud Run adapter listening on :${port}`);
});