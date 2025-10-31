import json
import requests
import logging
import os
import time
import psycopg2
from typing import Dict, Any, Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def refresh_token(login: str, password: str) -> Optional[str]:
    '''Get new auth token from ekomkassa-auth function'''
    try:
        auth_url = 'https://functions.poehali.dev/b9da35cd-e700-4dba-bd0a-275e029345e0'
        auth_response = requests.post(
            auth_url,
            json={'login': login, 'password': password},
            timeout=10
        )
        if auth_response.status_code == 200:
            auth_data = auth_response.json()
            return auth_data.get('token')
    except Exception as e:
        logger.error(f"[RECEIPT] Failed to refresh token: {str(e)}")
    return None

def is_token_expired(response: requests.Response) -> bool:
    '''Check if token is expired based on response'''
    if response.status_code == 401:
        return True
    try:
        data = response.json()
        return data.get('error') == 'ExpiredToken' or data.get('Error', {}).get('Code') == 'ExpiredToken'
    except:
        return False

def log_to_db(function_name: str, log_level: str, message: str, 
              request_data: Optional[Dict] = None, response_data: Optional[Dict] = None,
              request_id: Optional[str] = None, duration_ms: Optional[int] = None,
              status_code: Optional[int] = None) -> None:
    '''Write log entry to database'''
    try:
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            return
        
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute(
            "INSERT INTO logs (function_name, log_level, message, request_data, response_data, request_id, duration_ms, status_code) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (
                function_name,
                log_level,
                message,
                json.dumps(request_data) if request_data else None,
                json.dumps(response_data) if response_data else None,
                request_id,
                duration_ms,
                status_code
            )
        )
        
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to write log to DB: {str(e)}")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Ferma-совместимый API для создания чеков
    Ferma URL: POST https://ferma.ofd.ru/api/kkt/cloud/receipt
    Gateway URL: POST https://{gateway}/api/kkt/cloud/receipt
    Target: https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/{operation}
    Request: Ferma receipt format with Request.CustomerReceipt
    Response: eKomKassa receipt creation response
    '''
    start_time = time.time()
    request_id = getattr(context, 'request_id', None)
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
    
    logger.info(f"[RECEIPT] Incoming request: {json.dumps(body_data, ensure_ascii=False)}")
    log_to_db('ekomkassa-receipt', 'INFO', 'Incoming receipt request',
              request_data=body_data,
              request_id=request_id)
    
    ferma_request = body_data.get('Request')
    login = body_data.get('login')
    password = body_data.get('password')
    
    if ferma_request:
        result = convert_ferma_to_ekomkassa(ferma_request, body_data.get('token'), body_data.get('group_code', '700'), login, password, context, start_time, request_id)
    else:
        result = convert_simple_format(body_data, login, password, context, start_time, request_id)
    
    return result


def convert_ferma_to_ekomkassa(ferma_request: Dict[str, Any], token: Optional[str], group_code: str, login: Optional[str], password: Optional[str], context: Any, start_time: float, request_id: Optional[str]) -> Dict[str, Any]:
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
        'Vat20': 'vat20',
        'CalculatedVat20120': 'vat20',
        'CalculatedVat10110': 'vat10'
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
        'IncomeReturn': 'sell_refund',
        'Outcome': 'buy',
        'OutcomeReturn': 'buy_refund',
        'IncomeCorrection': 'sell_correction',
        'SellCorrection': 'sell_correction',
        'OutcomeCorrection': 'buy_correction',
        'BuyCorrection': 'buy_correction',
        'IncomeReturnCorrection': 'sell_refund_correction',
        'SellRefundCorrection': 'sell_refund_correction',
        'OutcomeReturnCorrection': 'buy_refund_correction',
        'BuyRefundCorrection': 'buy_refund_correction'
    }
    
    operation = operation_mapping.get(ferma_request.get('Type', 'Income'), 'sell')
    is_correction = operation in ['sell_correction', 'buy_correction', 'sell_refund_correction', 'buy_refund_correction']
    
    client_info = {}
    if receipt.get('Email'):
        client_info['email'] = receipt['Email']
    if receipt.get('Phone'):
        client_info['phone'] = receipt['Phone']
    
    timestamp = datetime.now().strftime('%d.%m.%Y %H:%M:%S')
    
    company_data = {
        'email': client_info.get('email', 'shop@example.com'),
        'sno': sno,
        'inn': ferma_request.get('Inn', '0000000000'),
        'payment_address': ferma_request.get('CallbackUrl', 'https://example.com')
    }
    
    if is_correction:
        correction_info = receipt.get('CorrectionInfo', {})
        correction_type_mapping = {
            'SELF': 'self',
            'INSTRUCTION': 'instruction'
        }
        
        atol_receipt = {
            'timestamp': timestamp,
            'external_id': ferma_request.get('InvoiceId', f'order_{context.request_id}'),
            'correction': {
                'client': client_info,
                'company': company_data,
                'correction_info': {
                    'type': correction_type_mapping.get(correction_info.get('Type', 'SELF'), 'self'),
                    'base_date': correction_info.get('ReceiptDate', '01.01.2025'),
                    'base_number': correction_info.get('ReceiptId', '1'),
                    'base_name': correction_info.get('Description', 'Корректировка')
                },
                'items': atol_items,
                'payments': atol_payments,
                'total': sum(item['sum'] for item in atol_items)
            }
        }
    else:
        atol_receipt = {
            'timestamp': timestamp,
            'external_id': ferma_request.get('InvoiceId', f'order_{context.request_id}'),
            'receipt': {
                'client': client_info,
                'company': company_data,
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
    
    def make_receipt_request(current_token: str) -> requests.Response:
        '''Make receipt request to eKomKassa'''
        logger.info(f"[RECEIPT-FERMA] Request to eKomKassa: endpoint={endpoint}, payload={json.dumps(atol_receipt, ensure_ascii=False)}")
        return requests.post(
            endpoint,
            json=atol_receipt,
            headers={
                'Content-Type': 'application/json',
                'Token': current_token
            },
            timeout=15
        )
    
    log_to_db('ekomkassa-receipt', 'INFO', 'Sending Ferma format receipt to eKomKassa',
              request_data={'endpoint': endpoint, 'payload': atol_receipt},
              request_id=request_id)
    
    try:
        response = make_receipt_request(token)
        
        if is_token_expired(response) and login and password:
            logger.info(f"[RECEIPT-FERMA] Token expired, attempting refresh")
            new_token = refresh_token(login, password)
            if new_token:
                logger.info(f"[RECEIPT-FERMA] Token refreshed, retrying request")
                response = make_receipt_request(new_token)
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[RECEIPT-FERMA] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        try:
            response_json = response.json()
        except:
            response_json = {'raw': response.text}
        
        log_level = 'ERROR' if response.status_code >= 400 else 'INFO'
        log_to_db('ekomkassa-receipt', log_level, 'eKomKassa Ferma receipt response received',
                  request_data={'endpoint': endpoint},
                  response_data=response_json,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        if response.status_code == 200 and isinstance(response_json, dict):
            if response_json.get('status') == 'done' or response_json.get('uuid'):
                ferma_response = {
                    'Status': 'Success',
                    'Data': {
                        'ReceiptId': response_json.get('uuid', '')
                    },
                    'ekomkassa_response': response_json
                }
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                    'body': json.dumps(ferma_response),
                    'isBase64Encoded': False
                }
        
        error_code = response.status_code
        error_message = 'Unknown error'
        
        if isinstance(response_json, dict):
            if 'code' in response_json and 'text' in response_json:
                error_code = response_json['code']
                error_message = response_json['text']
            elif response_json.get('error'):
                error_obj = response_json['error']
                if isinstance(error_obj, dict):
                    error_code = error_obj.get('code', error_obj.get('error_id', response.status_code))
                    error_message = error_obj.get('text', str(error_obj))
                elif isinstance(error_obj, str):
                    error_message = error_obj
        
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': error_code,
                'Message': error_message
            },
            'ekomkassa_response': response_json
        }
        
        return {
            'statusCode': response.status_code,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps(ferma_error),
            'isBase64Encoded': False
        }
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[RECEIPT-FERMA] eKomKassa API error: {str(e)}")
        log_to_db('ekomkassa-receipt', 'ERROR', f'eKomKassa API error (Ferma): {str(e)}',
                  request_data={'endpoint': endpoint},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': 500,
                'Message': f'eKomKassa API error: {str(e)}'
            },
            'ekomkassa_response': {}
        }
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps(ferma_error),
            'isBase64Encoded': False
        }


def convert_simple_format(body_data: Dict[str, Any], login: Optional[str], password: Optional[str], context: Any, start_time: float, request_id: Optional[str]) -> Dict[str, Any]:
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
    
    def make_simple_receipt_request(current_token: str) -> requests.Response:
        '''Make simple receipt request to eKomKassa'''
        logger.info(f"[RECEIPT-SIMPLE] Request to eKomKassa: endpoint={endpoint}, payload={json.dumps(atol_receipt, ensure_ascii=False)}")
        return requests.post(
            endpoint,
            json=atol_receipt,
            headers={
                'Content-Type': 'application/json',
                'Token': current_token
            },
            timeout=15
        )
    
    log_to_db('ekomkassa-receipt', 'INFO', 'Sending simple format receipt to eKomKassa',
              request_data={'endpoint': endpoint, 'payload': atol_receipt},
              request_id=request_id)
    
    try:
        response = make_simple_receipt_request(token)
        
        if is_token_expired(response) and login and password:
            logger.info(f"[RECEIPT-SIMPLE] Token expired, attempting refresh")
            new_token = refresh_token(login, password)
            if new_token:
                logger.info(f"[RECEIPT-SIMPLE] Token refreshed, retrying request")
                response = make_simple_receipt_request(new_token)
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[RECEIPT-SIMPLE] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        try:
            response_json = response.json()
        except:
            response_json = {'raw': response.text}
        
        log_to_db('ekomkassa-receipt', 'INFO', 'eKomKassa simple receipt response received',
                  request_data={'endpoint': endpoint},
                  response_data=response_json,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        combined_response = {
            'ekomkassa_response': response_json
        }
        return {
            'statusCode': response.status_code,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps(combined_response),
            'isBase64Encoded': False
        }
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[RECEIPT-SIMPLE] eKomKassa API error: {str(e)}")
        log_to_db('ekomkassa-receipt', 'ERROR', f'eKomKassa API error (Simple): {str(e)}',
                  request_data={'endpoint': endpoint},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'eKomKassa API error: {str(e)}'}),
            'isBase64Encoded': False
        }