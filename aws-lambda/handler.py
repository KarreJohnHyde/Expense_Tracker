import json
import boto3
import uuid
import os
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
expenses_table = dynamodb.Table(os.environ.get('EXPENSES_TABLE', 'Expenses'))
budgets_table = dynamodb.Table(os.environ.get('BUDGETS_TABLE', 'Budgets'))

CATEGORIES = {
    'food': 'Food & Dining',
    'swiggy': 'Food & Dining',
    'zomato': 'Food & Dining',
    'restaurant': 'Food & Dining',
    'cafe': 'Food & Dining',
    'grocery': 'Food & Dining',
    'uber': 'Transportation',
    'ola': 'Transportation',
    'petrol': 'Transportation',
    'metro': 'Transportation',
    'amazon': 'Shopping',
    'flipkart': 'Shopping',
    'myntra': 'Shopping',
    'bill': 'Bills & Utilities',
    'electricity': 'Bills & Utilities',
    'recharge': 'Bills & Utilities',
    'netflix': 'Entertainment',
    'prime': 'Entertainment',
    'movie': 'Entertainment',
    'hospital': 'Healthcare',
    'pharmacy': 'Healthcare',
    'gym': 'Healthcare',
    'course': 'Education',
    'school': 'Education',
    'college': 'Education',
}

def ai_categorize(description: str) -> dict:
    text = description.lower()
    for keyword, category in CATEGORIES.items():
        if keyword in text:
            return {'category': category, 'confidence': 0.88}
    return {'category': 'Others', 'confidence': 0.5}

def make_response(status_code: int, body: dict) -> dict:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        'body': json.dumps(body),
    }

def lambda_handler(event, context):
    method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'GET'))
    path = event.get('path', event.get('rawPath', '/'))

    # OPTIONS pre-flight
    if method == 'OPTIONS':
        return make_response(200, {})

    # ── /expenses ──────────────────────────────────────────────────────
    if path == '/expenses' or path == '/expenses/':
        if method == 'GET':
            response = expenses_table.scan()
            return make_response(200, {'expenses': response.get('Items', [])})

        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            expense_id = str(uuid.uuid4())
            item = {
                'expense_id': expense_id,
                'id': expense_id,
                'description': body.get('description', ''),
                'amount': body.get('amount', 0),
                'category': body.get('category', 'Others'),
                'date': body.get('date', datetime.now().isoformat()),
                'paymentMethod': body.get('paymentMethod', ''),
                'tags': body.get('tags', []),
                'location': body.get('location', ''),
                'notes': body.get('notes', ''),
                'createdAt': datetime.now().isoformat(),
            }
            expenses_table.put_item(Item=item)
            return make_response(201, item)

    # ── /expenses/{id} ─────────────────────────────────────────────────
    path_parts = path.strip('/').split('/')
    if len(path_parts) == 2 and path_parts[0] == 'expenses':
        expense_id = path_parts[1]

        if method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            expenses_table.update_item(
                Key={'expense_id': expense_id},
                UpdateExpression='SET #amt=:a, #cat=:c, #dt=:d, #desc=:desc, #pm=:pm',
                ExpressionAttributeNames={
                    '#amt': 'amount', '#cat': 'category', '#dt': 'date', '#desc': 'description', '#pm': 'paymentMethod'
                },
                ExpressionAttributeValues={
                    ':a': body.get('amount', 0),
                    ':c': body.get('category', 'Others'),
                    ':d': body.get('date', ''),
                    ':desc': body.get('description', ''),
                    ':pm': body.get('paymentMethod', ''),
                },
            )
            return make_response(200, {'message': 'Expense updated', 'id': expense_id})

        if method == 'DELETE':
            expenses_table.delete_item(Key={'expense_id': expense_id})
            return make_response(200, {'message': 'Expense deleted'})

    # ── /budgets ───────────────────────────────────────────────────────
    if path == '/budgets' or path == '/budgets/':
        if method == 'GET':
            response = budgets_table.scan()
            return make_response(200, {'budgets': response.get('Items', [])})

        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            budget_id = str(uuid.uuid4())
            item = {
                'budget_id': budget_id,
                'id': budget_id,
                'category': body.get('category', ''),
                'amount': body.get('amount', 0),
                'period': body.get('period', 'monthly'),
            }
            budgets_table.put_item(Item=item)
            return make_response(201, item)

    # ── /ai/categorize ─────────────────────────────────────────────────
    if path in ['/ai/categorize', '/ai/categorize/']:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            result = ai_categorize(body.get('description', ''))
            return make_response(200, result)

    # ── /v1/webhooks/sms-sync ──────────────────────────────────────────
    if '/webhooks/sms-sync' in path:
        if method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'text/html'},
                'body': '<h1>Webhook Active ✅</h1><p>Send POST requests to this endpoint.</p>',
            }
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            # In production, parse and save as expense
            return make_response(200, {'success': True, 'message': 'SMS received'})

    return make_response(404, {'error': f'Route not found: {method} {path}'})
