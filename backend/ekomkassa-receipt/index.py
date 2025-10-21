import json
import os
from typing import Dict, Any, Optional
import urllib.request
import urllib.error

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Конвертация Ferma чека в eKomKassa receipt (sell/refund)
    Args: event с httpMethod, body {operation, items, payments, token, group_code}
          context с request_id
    Returns: HTTP response с результатом создания чека
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    raw_body = event.get('body', '{}')
    if not raw_body or raw_body == '':
        raw_body = '{}'
    
    body_data = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    
    operation = body_data.get('operation', 'sell')
    items = body_data.get('items', [])
    payments = body_data.get('payments', [])
    token = body_data.get('token', '')
    group_code = body_data.get('group_code', '700')
    
    if not token:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'token is required'}),
            'isBase64Encoded': False
        }
    
    if not items:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'items are required'}),
            'isBase64Encoded': False
        }
    
    vat_mapping = {
        'vat20': 'vat20',
        'vat10': 'vat10',
        'vat0': 'vat0',
        'none': 'none'
    }
    
    payment_type_mapping = {
        'cash': 0,
        'card': 1,
        'prepaid': 2,
        'credit': 3
    }
    
    converted_items = []
    for item in items:
        converted_item = {
            'name': item.get('name', ''),
            'price': item.get('price', 0),
            'quantity': item.get('quantity', 1),
            'sum': item.get('price', 0) * item.get('quantity', 1),
            'payment_method': 'full_payment',
            'payment_object': 'commodity',
            'vat': {
                'type': vat_mapping.get(item.get('tax', 'none'), 'none')
            }
        }
        converted_items.append(converted_item)
    
    converted_payments = []
    for payment in payments:
        converted_payment = {
            'type': payment_type_mapping.get(payment.get('type', 'cash'), 0),
            'sum': payment.get('sum', 0)
        }
        converted_payments.append(converted_payment)
    
    total = sum(item['sum'] for item in converted_items)
    
    ekomkassa_request = {
        'external_id': body_data.get('external_id', f'order_{context.request_id}'),
        'receipt': {
            'client': {
                'email': body_data.get('client_email', 'customer@example.com')
            },
            'company': {
                'email': body_data.get('company_email', 'shop@example.com'),
                'sno': body_data.get('sno', 'osn'),
                'inn': body_data.get('inn', '1234567890'),
                'payment_address': body_data.get('payment_address', 'https://example.com')
            },
            'items': converted_items,
            'payments': converted_payments,
            'total': total
        }
    }
    
    operation_endpoint = operation if operation in ['sell', 'refund', 'sell_correction', 'refund_correction'] else 'sell'
    ekomkassa_url = f'https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/{operation_endpoint}'
    
    try:
        req = urllib.request.Request(
            ekomkassa_url,
            data=json.dumps(ekomkassa_request).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Token': token
            }
        )
        
        with urllib.request.urlopen(req, timeout=15) as response:
            response_data = response.read().decode('utf-8')
            ekomkassa_response = json.loads(response_data)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(ekomkassa_response),
            'isBase64Encoded': False
        }
    
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': error_body,
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }