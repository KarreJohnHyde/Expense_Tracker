import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';

const isLocal = process.env.AWS_SAM_LOCAL === 'true';
const client = new DynamoDBClient({
  region: 'us-east-1',
  ...(isLocal ? { endpoint: 'http://host.docker.internal:4566' } : {})
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'ExpenseTrackerTable';
// Hardcoded user ID for prototyping (until Cognito authorizer is securely linked)
const USER_ID = 'USER#default';

function generateResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // allow CORS
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  console.log('Received event:', event.httpMethod, event.path);

  // Handle CORS preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return generateResponse(200, {});
  }

  try {
    const path = event.path;
    const body = event.body ? JSON.parse(event.body) : null;
    const idParam = event.pathParameters ? event.pathParameters.proxy : null; // Proxy captures the trailing parts natively or we parse path manually
    
    // Manual path parsing because proxy might just be the full path minus stage
    const segments = path.split('/').filter(Boolean);
    const resource = segments[0]; // 'expenses' or 'budgets'
    const id = segments.length > 1 ? segments[1] : null;

    if (resource === 'expenses') {
      if (event.httpMethod === 'GET') {
        const result = await docClient.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': USER_ID,
            ':skPrefix': 'EXPENSE#'
          }
        }));
        return generateResponse(200, { expenses: result.Items || [] });
      }

      if (event.httpMethod === 'POST') {
        const newExpense = {
          ...body,
          id: `exp_${crypto.randomUUID()}`
        };
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: USER_ID,
            SK: `EXPENSE#${newExpense.id}`,
            ...newExpense
          }
        }));
        return generateResponse(200, newExpense);
      }

      if (event.httpMethod === 'PUT' && id) {
        // Fetch existing
        const existing = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: USER_ID, SK: `EXPENSE#${id}` }
        }));
        if (!existing.Item) return generateResponse(404, { error: 'Not found' });
        
        const updatedExpense = {
          ...existing.Item,
          ...body,
          id // explicitly ensure ID doesn't morph
        };
        
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: USER_ID,
            SK: `EXPENSE#${id}`,
            ...updatedExpense
          }
        }));
        return generateResponse(200, updatedExpense);
      }

      if (event.httpMethod === 'DELETE' && id) {
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: USER_ID, SK: `EXPENSE#${id}` }
        }));
        return generateResponse(200, { success: true });
      }
    }

    if (resource === 'budgets') {
      // Handle the 'clear' keyword specifically
      if (event.httpMethod === 'DELETE' && id === 'clear') {
        const result = await docClient.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': USER_ID,
            ':skPrefix': 'BUDGET#'
          }
        }));
        if (result.Items) {
          for (const item of result.Items) {
            await docClient.send(new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { PK: USER_ID, SK: item.SK }
            }));
          }
        }
        return generateResponse(200, { success: true });
      }

      if (event.httpMethod === 'GET') {
        const result = await docClient.send(new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': USER_ID,
            ':skPrefix': 'BUDGET#'
          }
        }));
        return generateResponse(200, { budgets: result.Items || [] });
      }

      if (event.httpMethod === 'POST') {
        const newBudget = {
          ...body,
          id: `bud_${crypto.randomUUID()}`
        };
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: USER_ID,
            SK: `BUDGET#${newBudget.id}`,
            ...newBudget
          }
        }));
        return generateResponse(200, newBudget);
      }

      if (event.httpMethod === 'PUT' && id) {
        const existing = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: USER_ID, SK: `BUDGET#${id}` }
        }));
        if (!existing.Item) return generateResponse(404, { error: 'Not found' });
        
        const updatedBudget = {
          ...existing.Item,
          ...body,
          id
        };
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: USER_ID,
            SK: `BUDGET#${id}`,
            ...updatedBudget
          }
        }));
        return generateResponse(200, updatedBudget);
      }

      if (event.httpMethod === 'DELETE' && id) {
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: USER_ID, SK: `BUDGET#${id}` }
        }));
        return generateResponse(200, { success: true });
      }
    }

    // 404 for unhandled routes
    return generateResponse(404, { error: 'Not Found' });

  } catch (error) {
    console.error('Lambda Error:', error);
    return generateResponse(500, { error: error.message });
  }
};
