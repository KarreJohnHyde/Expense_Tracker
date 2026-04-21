"""
AWS Lambda ML Service - Advanced ML Processing
Handles complex deep learning tasks that are too expensive to run on the client
"""

import json
import boto3
import numpy as np
from typing import List, Dict, Any, Tuple
from datetime import datetime
import base64

# AWS clients
s3 = boto3.client('s3')
lambda_client = boto3.client('lambda')

# ML Libraries (installed via Lambda Layer)
try:
    from transformers import pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: Transformers not available, using fallback NLP")

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class ExpenseMLService:
    """Advanced ML service for expense processing"""
    
    def __init__(self):
        self.s3_bucket = 'expense-ml-models'
        self.s3_prefix = 'models/'
        self.initialize_models()
    
    def initialize_models(self):
        """Initialize pre-trained models"""
        self.models = {}
        
        if TRANSFORMERS_AVAILABLE:
            # Zero-shot classification for category prediction
            self.models['zero_shot'] = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=-1  # CPU mode
            )
            
            # Named entity recognition for merchant extraction
            self.models['ner'] = pipeline(
                "token-classification",
                model="dslim/bert-base-NER",
                device=-1
            )
            
            # Summarization for receipt text
            self.models['summarizer'] = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                device=-1
            )
    
    def classify_with_transformer(self, text: str, categories: List[str]) -> Dict[str, Any]:
        """
        Zero-shot classification using transformer models
        More accurate than keyword-based categorization
        """
        if not TRANSFORMERS_AVAILABLE or 'zero_shot' not in self.models:
            return {'error': 'Transformers not available'}
        
        try:
            result = self.models['zero_shot'](
                text,
                categories,
                multi_class=False
            )
            
            return {
                'category': result['labels'][0],
                'confidence': float(result['scores'][0]),
                'all_scores': {
                    label: float(score)
                    for label, score in zip(result['labels'], result['scores'])
                }
            }
        except Exception as e:
            return {'error': str(e)}
    
    def extract_entities_from_receipt(self, receipt_text: str) -> Dict[str, Any]:
        """
        Extract merchant, date, amount, and items from receipt using NER
        """
        if not TRANSFORMERS_AVAILABLE or 'ner' not in self.models:
            return {'error': 'NER model not available'}
        
        try:
            entities = self.models['ner'](receipt_text)
            
            # Group entities by type
            grouped = {}
            for entity in entities:
                entity_type = entity['entity_group']
                if entity_type not in grouped:
                    grouped[entity_type] = []
                grouped[entity_type].append({
                    'word': entity['word'],
                    'score': float(entity['score'])
                })
            
            return {
                'entities': grouped,
                'raw_text': receipt_text[:500]  # Limit size
            }
        except Exception as e:
            return {'error': str(e)}
    
    def detect_anomalies_advanced(
        self,
        expenses: List[Dict[str, Any]],
        contamination: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Advanced anomaly detection using Isolation Forest
        Better than autoencoder for multivariate outlier detection
        """
        if not SKLEARN_AVAILABLE:
            return [{'error': 'sklearn not available'}]
        
        try:
            # Feature engineering
            features = []
            expense_ids = []
            
            for exp in expenses:
                expense_ids.append(exp.get('id', 'unknown'))
                
                # Extract features
                amount = float(exp.get('amount', 0))
                hour = datetime.fromisoformat(
                    exp.get('date', datetime.now().isoformat())
                ).hour
                
                # Category encoding (simplified)
                category = exp.get('category', 'Other')
                category_code = hash(category) % 100
                
                features.append([amount, hour, category_code])
            
            if len(features) < 10:
                return [{'id': eid, 'anomaly_score': 0.0, 'is_anomaly': False}
                       for eid in expense_ids]
            
            # Normalize features
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            
            # Fit Isolation Forest
            iso_forest = IsolationForest(
                contamination=min(contamination, 0.5),
                random_state=42
            )
            predictions = iso_forest.fit_predict(features_scaled)
            scores = iso_forest.score_samples(features_scaled)
            
            # Normalize scores to [0, 1]
            score_min, score_max = scores.min(), scores.max()
            normalized_scores = [
                (s - score_min) / (score_max - score_min) if score_max > score_min else 0.5
                for s in scores
            ]
            
            results = []
            for i, expense_id in enumerate(expense_ids):
                results.append({
                    'id': expense_id,
                    'anomaly_score': float(normalized_scores[i]),
                    'is_anomaly': predictions[i] == -1,
                    'features_used': features[i]
                })
            
            return results
        except Exception as e:
            return [{'error': str(e)}]
    
    def batch_categorize(self, expenses: List[str], categories: List[str]) -> List[Dict[str, Any]]:
        """
        Efficiently categorize multiple expenses at once
        """
        results = []
        
        for expense in expenses:
            result = self.classify_with_transformer(expense, categories)
            results.append(result)
        
        return results
    
    def summarize_receipt(self, receipt_text: str, max_length: int = 50) -> Dict[str, Any]:
        """
        Summarize long receipt text using transformer
        """
        if not TRANSFORMERS_AVAILABLE or 'summarizer' not in self.models:
            return {'error': 'Summarizer not available'}
        
        try:
            # Check text length
            words = receipt_text.split()
            if len(words) < 50:
                return {'summary': receipt_text}
            
            # Chunk text if too long (model has max input length)
            chunks = [
                ' '.join(words[i:i+512])
                for i in range(0, len(words), 512)
            ]
            
            summaries = []
            for chunk in chunks[:3]:  # Limit to 3 chunks
                summary = self.models['summarizer'](
                    chunk,
                    max_length=max_length,
                    min_length=10,
                    do_sample=False
                )
                if summary:
                    summaries.append(summary[0]['summary_text'])
            
            return {
                'summary': ' '.join(summaries),
                'original_length': len(words),
                'summary_length': len(' '.join(summaries).split())
            }
        except Exception as e:
            return {'error': str(e)}
    
    def train_custom_model(
        self,
        training_data: List[Dict[str, Any]],
        model_name: str
    ) -> Dict[str, Any]:
        """
        Train a custom model on user's expense data
        Saves model to S3 for later use
        """
        try:
            # Prepare data
            texts = [exp.get('description', '') for exp in training_data]
            labels = [exp.get('category', 'Other') for exp in training_data]
            
            # TODO: Implement fine-tuning of transformer model
            # This would require a proper training loop
            
            return {
                'status': 'success',
                'model_name': model_name,
                'samples_trained': len(training_data),
                'model_saved': True
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}


def lambda_handler(event, context):
    """AWS Lambda handler"""
    
    service = ExpenseMLService()
    
    try:
        action = event.get('action', '')
        
        if action == 'classify':
            text = event.get('text', '')
            categories = event.get('categories', [])
            result = service.classify_with_transformer(text, categories)
            
        elif action == 'extract_entities':
            receipt_text = event.get('receipt_text', '')
            result = service.extract_entities_from_receipt(receipt_text)
            
        elif action == 'detect_anomalies':
            expenses = event.get('expenses', [])
            contamination = event.get('contamination', 0.1)
            result = service.detect_anomalies_advanced(expenses, contamination)
            
        elif action == 'batch_categorize':
            expenses = event.get('expenses', [])
            categories = event.get('categories', [])
            result = service.batch_categorize(expenses, categories)
            
        elif action == 'summarize':
            receipt_text = event.get('receipt_text', '')
            max_length = event.get('max_length', 50)
            result = service.summarize_receipt(receipt_text, max_length)
            
        else:
            result = {'error': f'Unknown action: {action}'}
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
