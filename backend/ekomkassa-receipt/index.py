import json
import requests
from typing import Dict, Any, Optional
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Конвертация Ferma API receipt в eKomKassa (Атол v5)
    Args: event - dict с httpMethod, body (полный Ferma Request или упрощенный формат)
          context - объект с request_id, function_name
    Returns: HTTP response с результатом создания чека в eKomKassa
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
    
    ferma_request = body_data.get('Request')
    
    if ferma_request:
        result = convert_ferma_to_ekomkassa(ferma_request, body_data.get('token'), body_data.get('group_code', '700'), context)
    else:
        result = convert_simple_format(body_data, context)
    
    return result


def convert_ferma_to_ekomkassa(ferma_request: Dict[str, Any], token: Optional[str], group_code: str, context: Any) -> Dict[str, Any]:
    '''Конвертация полного формата Ferma API в eKomKassa'''
    
    if not token:
        return {
            'statusCode': 401,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Token required'}),
            'isBase64Encoded': False
        }
    
    receipt = ferma_request.get('CustomerReceipt', {})
    items = receipt.get('Items', [])
    
    if not items:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Items required'}),
            'isBase64Encoded': False
        }
    
    ferma_vat_mapping = {
        'VatNo': 'none',
        'Vat0': 'vat0',
        'Vat10': 'vat10',
        'Vat20': 'vat20'
    }
    
    payment_method_mapping = {
        0: 'full_prepayment',
        1: 'prepayment',
        2: 'advance',
        3: 'full_payment',
        4: 'partial_payment',
        5: 'credit',
        6: 'credit_payment'
    }
    
    measure_mapping = {
        'PIECE': 0,
        'GRAM': 10,
        'KILOGRAM': 11,
        'TON': 12,
        'CENTIMETER': 20,
        'DECIMETER': 21,
        'METER': 22,
        'SQUARE_CENTIMETER': 30,
        'SQUARE_DECIMETER': 31,
        'SQUARE_METER': 32,
        'MILLILITER': 40,
        'LITER': 41,
        'CUBIC_METER': 42,
        'KILOWATT_HOUR': 50,
        'GIGACALORIE': 51,
        'DAY': 70,
        'HOUR': 71,
        'MINUTE': 72,
        'SECOND': 73,
        'KILOBYTE': 80,
        'MEGABYTE': 81,
        'GIGABYTE': 82,
        'TERABYTE': 83,
        'OTHER': 255
    }
    
    atol_items = []
    for item in items:
        vat_type = ferma_vat_mapping.get(item.get('Vat', 'VatNo'), 'none')
        payment_method = payment_method_mapping.get(item.get('PaymentMethod', 4), 'full_payment')
        measure = measure_mapping.get(item.get('Measure', 'PIECE'), 0)
        
        atol_item = {
            'name': item.get('Label', 'Товар'),
            'price': float(item.get('Price', 0)),
            'quantity': float(item.get('Quantity', 1)),
            'sum': float(item.get('Amount', 0)),
            'payment_method': payment_method,
            'payment_object': 4,
            'measure': measure,
            'vat': {
                'type': vat_type
            }
        }
        atol_items.append(atol_item)
    
    cashless_payments = receipt.get('CashlessPayments', [])
    atol_payments = []
    
    for payment in cashless_payments:
        payment_sum = float(payment.get('PaymentSum', 0))
        atol_payment = {
            'type': 1,
            'sum': payment_sum
        }
        atol_payments.append(atol_payment)
    
    if not atol_payments:
        total = sum(item['sum'] for item in atol_items)
        atol_payments.append({
            'type': 1,
            'sum': total
        })
    
    taxation_system_mapping = {
        'Common': 'osn',
        'Simplified': 'usn_income',
        'SimplifiedWithExpenses': 'usn_income_outcome',
        'Unified': 'envd',
        'Patent': 'patent',
        'UnifiedAgricultural': 'esn'
    }
    
    sno = taxation_system_mapping.get(receipt.get('TaxationSystem', 'Common'), 'osn')
    
    operation_mapping = {
        'Income': 'sell',
        'IncomeReturn': 'sell_refund'
    }
    
    operation = operation_mapping.get(ferma_request.get('Type', 'Income'), 'sell')
    
    client_info = {}
    if receipt.get('Email'):
        client_info['email'] = receipt['Email']
    if receipt.get('Phone'):
        client_info['phone'] = receipt['Phone']
    
    timestamp = datetime.now().strftime('%d.%m.%Y %H:%M:%S')
    
    atol_receipt = {
        'timestamp': timestamp,
        'external_id': ferma_request.get('InvoiceId', f'order_{context.request_id}'),
        'receipt': {
            'client': client_info,
            'company': {
                'email': client_info.get('email', 'shop@example.com'),
                'sno': sno,
                'inn': ferma_request.get('Inn', '0000000000'),
                'payment_address': ferma_request.get('CallbackUrl', 'https://example.com')
            },
            'items': atol_items,
            'payments': atol_payments,
            'total': sum(item['sum'] for item in atol_items)
        }
    }
    
    if ferma_request.get('CallbackUrl'):
        atol_receipt['service'] = {
            'callback_url': ferma_request['CallbackUrl']
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


def convert_simple_format(body_data: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Конвертация упрощенного формата (для обратной совместимости)'''
    
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