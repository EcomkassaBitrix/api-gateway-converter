import json
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Конвертация Ferma receipt в eKomKassa (Атол v5)
    Args: event - dict с httpMethod, body (operation, items, payments, group_code, token)
          context - объект с request_id, function_name
    Returns: HTTP response с результатом создания чека
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    
    operation = body_data.get('operation', 'sell')
    token = body_data.get('token')
    group_code = body_data.get('group_code', '700')
    items = body_data.get('items', [])
    payments = body_data.get('payments', [])
    
    if not token:
        return {
            'statusCode': 401,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Token required'}),
            'isBase64Encoded': False
        }
    
    if not items:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Items required'}),
            'isBase64Encoded': False
        }
    
    vat_mapping = {
        'vat20': 'vat20',
        'vat10': 'vat10',
        'vat0': 'vat0',
        'none': 'none'
    }
    
    payment_mapping = {
        'cash': 0,
        'card': 1,
        'prepaid': 2,
        'credit': 3
    }
    
    atol_items = []
    for item in items:
        atol_item = {
            'name': item.get('name', 'Товар'),
            'price': item.get('price', 0),
            'quantity': item.get('quantity', 1),
            'sum': item.get('price', 0) * item.get('quantity', 1),
            'payment_method': 'full_payment',
            'payment_object': 'commodity',
            'vat': {
                'type': vat_mapping.get(item.get('tax', 'none'), 'none')
            }
        }
        atol_items.append(atol_item)
    
    atol_payments = []
    for payment in payments:
        atol_payment = {
            'type': payment_mapping.get(payment.get('type', 'card'), 1),
            'sum': payment.get('sum', 0)
        }
        atol_payments.append(atol_payment)
    
    total = sum(item['sum'] for item in atol_items)
    
    atol_receipt = {
        'external_id': body_data.get('external_id', f'order_{context.request_id}'),
        'receipt': {
            'client': {
                'email': body_data.get('client_email', 'customer@example.com')
            },
            'company': {
                'email': body_data.get('company_email', 'shop@example.com'),
                'sno': body_data.get('sno', 'osn'),
                'inn': body_data.get('inn', '0000000000'),
                'payment_address': body_data.get('payment_address', 'https://example.com')
            },
            'items': atol_items,
            'payments': atol_payments,
            'total': total
        }
    }
    
    endpoint = f'https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/{operation}'
    
    try:
        response = requests.post(
            endpoint,
            json=atol_receipt,
            headers={
                'Content-Type': 'application/json',
                'Token': token
            },
            timeout=15
        )
        
        return {
            'statusCode': response.status_code,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': response.text,
            'isBase64Encoded': False
        }
    except requests.RequestException as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'eKomKassa API error: {str(e)}'}),
            'isBase64Encoded': False
        }
