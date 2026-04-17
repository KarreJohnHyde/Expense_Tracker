import json
import boto3
import uuid
import os
import base64
from datetime import datetime
import io
import re

# Additional dependencies for AI and image processing
try:
    from pyzbar.pyzbar import decode as qr_decode
    from PIL import Image
    import numpy as np
    import pandas as pd
    from sklearn.linear_model import LinearRegression
    HAS_ML_LIBS = True
except ImportError:
    HAS_ML_LIBS = False
    print("Warning: ML/Imaging libraries not fully installed. Fallback modes enabled.")

# Initialize AWS clients
aws_region = os.environ.get('AWS_REGION', 'us-east-1')
dynamodb = boto3.resource('dynamodb', region_name=aws_region)
s3_client = boto3.client('s3', region_name=aws_region)
textract_client = boto3.client('textract', region_name=aws_region)
bedrock_client = boto3.client('bedrock-runtime', region_name=aws_region)

EXPENSES_TABLE_NAME = os.environ.get('EXPENSES_TABLE', 'Expenses')
expenses_table = dynamodb.Table(EXPENSES_TABLE_NAME)
BUDGETS_TABLE_NAME = os.environ.get('BUDGETS_TABLE', 'Budgets')
budgets_table = dynamodb.Table(BUDGETS_TABLE_NAME)
S3_UPLOAD_BUCKET = os.environ.get('S3_UPLOAD_BUCKET', 'expense-ai-receipts-bucket')

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
    # Ensure all Numpy/Pandas types are JSON serializable
    cleaned_body = json.loads(json.dumps(body, default=str))
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        'body': json.dumps(cleaned_body),
    }

def handle_s3_upload(base64_data: str, filename: str) -> str:
    """Uploads a base64 image string to S3 and returns the public or presigned URL."""
    try:
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        image_bytes = base64.b64decode(base64_data)
        
        # Check standard S3 constraints or mock if bucket doesn't actually exist
        # We catch exceptions to allow local fallback debugging
        s3_client.put_object(
            Bucket=S3_UPLOAD_BUCKET,
            Key=filename,
            Body=image_bytes,
            ContentType='image/jpeg'
        )
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_UPLOAD_BUCKET, 'Key': filename},
            ExpiresIn=604800 # 1 week
        )
        return url
    except Exception as e:
        print(f"S3 Upload failed, falling back to data-uri: {e}")
        # For seamless frontend operation if S3 bucket isn't provisioned yet
        return f"data:image/jpeg;base64,{base64_data}"

def perform_textract_ocr(image_bytes: bytes) -> str:
    """Uses AWS Textract to detect text. Returns raw string."""
    try:
        response = textract_client.detect_document_text(Document={'Bytes': image_bytes})
        lines = [block['Text'] for block in response.get('Blocks', []) if block['BlockType'] == 'LINE']
        return "\n".join(lines)
    except Exception as e:
        print(f"Textract Error: {e}")
        return ""

def perform_llm_extraction(raw_text: str) -> dict:
    """Uses a lightweight LLM prompt (e.g., Claude 3 Haiku on Bedrock) to parse structured JSON."""
    if not raw_text.strip():
        raise ValueError("No text provided for extraction.")
        
    prompt = f"""You are an expert AI expense auditor. Extract the following receipt details into a strict JSON object. 
If a value is not found, use null or "Others".
Only output valid JSON with the exact spelling of these keys: Description (string), Amount (number), Category (string), Date (YYYY-MM-DD), PaymentMethod (string). Do not include any other markdown.

Receipt Text:
{raw_text}
"""
    try:
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0
        })
        # Defaulting to Claude 3 Haiku for fast, cheap inference
        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=body
        )
        resp_body = json.loads(response.get('body').read())
        content = resp_body.get('content', [{}])[0].get('text', '')
        
        # Clean JSON blocks
        if "```json" in content:
            content = content.split("```json")[-1].split("```")[0].strip()
            
        parsed = json.loads(content)
        cleaned_amount = float(re.sub(r'[^0-9.]', '', str(parsed.get('Amount', 0)))) if parsed.get('Amount') else 0.0
        
        return {
            "Description": parsed.get('Description', 'Unknown Merchant'),
            "Amount": cleaned_amount,
            "Category": parsed.get('Category', 'Others'),
            "Date": parsed.get('Date', datetime.now().isoformat()[:10]),
            "PaymentMethod": parsed.get('PaymentMethod', 'Cash')
        }
    except Exception as e:
        print(f"Bedrock LLM Error: {e}")
        # Simple regex fallback if Bedrock isn't configured in region
        return fallback_regex_extraction(raw_text)

def fallback_regex_extraction(text: str) -> dict:
    amount_matches = re.findall(r'(?:Rs|INR|₹|\$)\s*([\d,]+\.\d{2})', text, re.IGNORECASE)
    amounts = [float(a.replace(',', '')) for a in amount_matches] if amount_matches else []
    total = max(amounts) if amounts else 0.0
    
    # Classify description based on dictionary
    cat_result = ai_categorize(text)
    
    return {
        "Description": text.split('\n')[0] if text else "Scanned Receipt",
        "Amount": total,
        "Category": cat_result['category'],
        "Date": datetime.now().isoformat()[:10],
        "PaymentMethod": "Cash"
    }

def decode_qr_or_barcode(image_bytes: bytes):
    if not HAS_ML_LIBS:
        return None
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        decoded = qr_decode(img)
        if decoded:
            return decoded[0].data.decode('utf-8')
    except Exception as e:
        print(f"QR Decode Error: {e}")
    return None

def analyze_expenses(expenses):
    """Module 3: Advanced Analytics & Budget Forecasting (Python ML)"""
    if not expenses:
        return {"categoryBreakdown": [], "forecast": {}, "anomalies": []}
    
    df = pd.DataFrame(expenses)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    
    # 1. Category Aggregation
    cat_agg = df.groupby('category')['amount'].sum().reset_index()
    categoryBreakdown = cat_agg.to_dict('records')
    
    # 2. Forecasting (Simple Linear Regression on daily spending)
    forecast_data = {"predictedEndMonth": 0, "dailyAverage": 0, "trend": "stable"}
    if len(df) >= 3 and HAS_ML_LIBS:
        daily_spending = df.groupby(df['date'].dt.date)['amount'].sum().reset_index()
        daily_spending['day_index'] = range(len(daily_spending))
        
        X = daily_spending[['day_index']].values
        y = daily_spending['amount'].values
        
        model = LinearRegression().fit(X, y)
        current_idx = daily_spending['day_index'].max()
        
        # Predict next 7 days sum
        future_X = np.array([[current_idx + i] for i in range(1, 8)])
        future_preds = model.predict(future_X)
        
        trend = "up" if model.coef_[0] > 0 else "down"
        
        avg = float(np.mean(y))
        forecast_data = {
            "dailyAverage": float(round(avg, 2)),
            "predictedNext7Days": float(round(sum(future_preds), 2)),
            "trend": trend,
            "slope": float(model.coef_[0])
        }
    else:
        # Simple stats if insufficient data
        forecast_data["dailyAverage"] = df['amount'].sum() / len(df)
        
    # 3. Anomalies (Z-Score on amounts)
    anomalies = []
    mean_val = df['amount'].mean()
    std_val = df['amount'].std()
    
    if std_val > 0:
        df['zscore'] = (df['amount'] - mean_val) / std_val
        outliers = df[np.abs(df['zscore']) > 2.0]
        for _, row in outliers.iterrows():
            anomalies.append({
                "description": row.get('description', 'Unknown'),
                "amount": float(row['amount']),
                "category": row['category'],
                "zscore": float(round(row['zscore'], 2)),
                "date": str(row['date'].date()) if pd.notnull(row['date']) else ""
            })
            
    return {
        "categoryBreakdown": categoryBreakdown,
        "forecast": forecast_data,
        "anomalies": anomalies,
        "totalExpenses": len(df),
        "totalAmount": float(df['amount'].sum())
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
            # Sort natively in python by date desc
            items = sorted(response.get('Items', []), key=lambda x: x.get('createdAt', ''), reverse=True)
            return make_response(200, {'expenses': items})

        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            expense_id = str(uuid.uuid4())
            item = {
                'id': expense_id,
                'expense_id': expense_id,
                'description': body.get('description', ''),
                'amount': float(body.get('amount', 0)),
                'category': body.get('category', 'Others'),
                'date': body.get('date', datetime.now().isoformat()[:10]),
                'paymentMethod': body.get('paymentMethod', 'Cash'),
                'tags': body.get('tags', []),
                'location': body.get('location', ''),
                'source': body.get('source', 'manual'),
                'receiptImage': body.get('receiptImage', None),
                'scanData': body.get('scanData', None),
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
            
            # Simple attribute merging fallback if complex UpdateExpression is strict
            try:
                response = expenses_table.get_item(Key={'id': expense_id})
                item = response.get('Item', {})
                if not item:
                    # check PK mappings
                    response = expenses_table.get_item(Key={'expense_id': expense_id})
                    item = response.get('Item', {})
            except:
                item = {}
                
            for k, v in body.items():
                item[k] = v
                
            # If item found, update
            if item:
                expenses_table.put_item(Item=item)
                return make_response(200, item)
            return make_response(404, {'error': 'Expense not found'})

        if method == 'DELETE':
            try:
                expenses_table.delete_item(Key={'id': expense_id})
            except:
                expenses_table.delete_item(Key={'expense_id': expense_id})
            return make_response(200, {'message': 'Expense deleted', 'id': expense_id})

    # ── Module 1: AI/OCR Receipt Scanner ────────────────────────────────
    if path in ['/ai/scan-receipt', '/ai/scan-receipt/'] and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        base64_img = body.get('image', '')
        if not base64_img:
            return make_response(400, {'error': 'No image provided'})
            
        try:
            b64_only = base64_img.split(',')[1] if ',' in base64_img else base64_img
            image_bytes = base64.b64decode(b64_only)
            
            # 1. Try QR Decoding first
            qr_text = decode_qr_or_barcode(image_bytes)
            if qr_text:
                return make_response(200, {
                    'type': 'qr',
                    'rawText': qr_text,
                    'extractedData': perform_llm_extraction(qr_text)
                })
                
            # 2. Standard OCR using AWS Textract
            ocr_text = perform_textract_ocr(image_bytes)
            if not ocr_text:
                return make_response(500, {'error': 'Textract failed or returned blank image.'})
                
            # 3. LLM Parsing
            structured_data = perform_llm_extraction(ocr_text)
            
            # Return full payload
            return make_response(200, {
                'type': 'ocr_receipt',
                'rawText': ocr_text,
                'extractedData': structured_data
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return make_response(500, {'error': str(e)})

    # ── Module 2: Image Upload to S3 ────────────────────────────────────
    if path in ['/upload', '/upload/'] and method == 'POST':
        body = json.loads(event.get('body', '{}'))
        base64_img = body.get('image', '')
        if not base64_img:
            return make_response(400, {'error': 'No image provided'})
        
        filename = f"receipt_{uuid.uuid4().hex[:8]}.jpg"
        url = handle_s3_upload(base64_img, filename)
        return make_response(200, {'url': url, 'id': filename})

    # ── Module 3: ML Analytics & Budgeting ──────────────────────────────
    if path in ['/ai/analytics', '/ai/analytics/'] and method == 'GET':
        response = expenses_table.scan()
        items = response.get('Items', [])
        
        if not HAS_ML_LIBS:
            # Return basic aggregation
            return make_response(200, {
                "message": "PANDAS_NOT_INSTALLED",
                "totalExpenses": len(items)
            })
            
        analysis = analyze_expenses(items)
        return make_response(200, analysis)

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



    # Default 404
    return make_response(404, {'error': f'Route not found: {method} {path}'})
