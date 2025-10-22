import json
import requests
import logging
import os
import time
import psycopg2
from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
from typing import Dict, Any, Optional
from datetime import datetime
from functools import wraps

app = Flask(__name__, static_folder='dist', static_url_path='')
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'ecomkassa-gateway-secret-key-2025')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

# Admin credentials
ADMIN_LOGIN = 'admin'
ADMIN_PASSWORD = 'GatewayEcomkassa'

def require_auth(f):
    '''Decorator for routes that require authentication'''
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def log_to_db(function_name: str, log_level: str, message: str, 
              request_data: Optional[Dict] = None, response_data: Optional[Dict] = None,
              request_id: Optional[str] = None, duration_ms: Optional[int] = None,
              status_code: Optional[int] = None) -> None:
    '''Write log entry to database'''
    try:
        if not DATABASE_URL:
            logger.warning("DATABASE_URL not set, skipping DB logging")
            return
        
        conn = psycopg2.connect(DATABASE_URL)
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


# ============================================
# AUTH ENDPOINT
# ============================================
@app.route('/api/Authorization/CreateAuthToken', methods=['POST', 'OPTIONS'])
def auth_handler():
    '''
    Ferma-совместимый API для получения токена авторизации
    Ferma URL: POST https://ferma.ofd.ru/api/Authorization/CreateAuthToken
    Target: https://app.ecomkassa.ru/fiscalorder/v5/getToken
    '''
    start_time = time.time()
    request_id = request.headers.get('X-Request-ID', str(time.time()))
    
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response, 200
    
    body_data = request.get_json(silent=True) or {}
    login = body_data.get('login')
    password = body_data.get('password')
    
    logger.info(f"[AUTH] Incoming request: login={login}, password={'***' if password else None}")
    log_to_db('auth', 'INFO', 'Incoming auth request', 
              request_data={'login': login, 'has_password': bool(password)}, 
              request_id=request_id)
    
    if not login or not password:
        return jsonify({'error': 'login and password required'}), 400
    
    try:
        request_payload = {'login': login, 'pass': password}
        logger.info(f"[AUTH] Request to eKomKassa: {json.dumps({'login': login, 'pass': '***'})}")
        
        response = requests.post(
            'https://app.ecomkassa.ru/fiscalorder/v5/getToken',
            json=request_payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[AUTH] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        try:
            response_json = response.json()
        except:
            response_json = {'raw': response.text}
        
        log_to_db('auth', 'INFO', 'eKomKassa response received',
                  request_data={'login': login},
                  response_data=response_json,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        flask_response = app.response_class(
            response=response.text,
            status=response.status_code,
            mimetype='application/json'
        )
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response
        
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[AUTH] eKomKassa API error: {str(e)}")
        log_to_db('auth', 'ERROR', f'eKomKassa API error: {str(e)}',
                  request_data={'login': login},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        return jsonify({'error': f'eKomKassa API error: {str(e)}'}), 500


# ============================================
# STATUS ENDPOINT
# ============================================
@app.route('/api/kkt/cloud/status', methods=['GET', 'OPTIONS'])
def status_handler():
    '''
    Ferma-совместимый API для получения статуса чека
    Ferma URL: GET https://ferma.ofd.ru/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}
    Target: https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/report/{uuid}
    '''
    start_time = time.time()
    request_id = request.headers.get('X-Request-ID', str(time.time()))
    
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response, 200
    
    auth_token = request.args.get('AuthToken')
    group_code = request.args.get('group_code', '700')
    uuid = request.args.get('uuid')
    
    logger.info(f"[STATUS] Incoming request: uuid={uuid}, group_code={group_code}, token={'***' if auth_token else None}")
    log_to_db('status', 'INFO', 'Incoming status check request',
              request_data={'uuid': uuid, 'group_code': group_code, 'has_token': bool(auth_token)},
              request_id=request_id)
    
    if not auth_token:
        return jsonify({'error': 'AuthToken required'}), 400
    
    if not uuid:
        return jsonify({'error': 'uuid required'}), 400
    
    ekomkassa_url = f'https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/report/{uuid}'
    logger.info(f"[STATUS] Request to eKomKassa: {ekomkassa_url}")
    
    try:
        response = requests.get(
            ekomkassa_url,
            headers={
                'Content-Type': 'application/json',
                'Token': auth_token
            },
            timeout=10
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[STATUS] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        try:
            response_json = response.json()
        except:
            response_json = {'raw': response.text}
        
        log_to_db('status', 'INFO', 'eKomKassa status response received',
                  request_data={'uuid': uuid, 'group_code': group_code},
                  response_data=response_json,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        flask_response = app.response_class(
            response=response.text,
            status=response.status_code,
            mimetype='application/json'
        )
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response
        
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[STATUS] eKomKassa API error: {str(e)}")
        log_to_db('status', 'ERROR', f'eKomKassa API error: {str(e)}',
                  request_data={'uuid': uuid, 'group_code': group_code},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        return jsonify({'error': f'eKomKassa API error: {str(e)}'}), 500


# ============================================
# RECEIPT ENDPOINT
# ============================================
@app.route('/api/kkt/cloud/receipt', methods=['POST', 'OPTIONS'])
def receipt_handler():
    '''
    Ferma-совместимый API для создания чеков
    Ferma URL: POST https://ferma.ofd.ru/api/kkt/cloud/receipt
    Target: https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/{operation}
    '''
    start_time = time.time()
    request_id = request.headers.get('X-Request-ID', str(time.time()))
    
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response, 200
    
    body_data = request.get_json(silent=True) or {}
    
    logger.info(f"[RECEIPT] Incoming request: {json.dumps(body_data, ensure_ascii=False)}")
    log_to_db('receipt', 'INFO', 'Incoming receipt request',
              request_data=body_data,
              request_id=request_id)
    
    ferma_request = body_data.get('Request')
    
    if ferma_request:
        result = convert_ferma_to_ekomkassa(ferma_request, body_data.get('token'), 
                                           body_data.get('group_code', '700'), 
                                           start_time, request_id)
    else:
        result = convert_simple_format(body_data, start_time, request_id)
    
    return result


def convert_ferma_to_ekomkassa(ferma_request: Dict[str, Any], token: Optional[str], 
                               group_code: str, start_time: float, request_id: Optional[str]):
    '''Конвертация полного формата Ferma API в eKomKassa'''
    
    if not token:
        return jsonify({'error': 'Token required'}), 401
    
    receipt = ferma_request.get('CustomerReceipt', {})
    items = receipt.get('Items', [])
    
    if not items:
        return jsonify({'error': 'Items required'}), 400
    
    # VAT mapping
    ferma_vat_mapping = {
        'VatNo': 'none',
        'Vat0': 'vat0',
        'Vat10': 'vat10',
        'Vat20': 'vat20',
        'CalculatedVat20120': 'vat20',
        'CalculatedVat10110': 'vat10'
    }
    
    # Payment method mapping
    payment_method_mapping = {
        0: 'full_prepayment',
        1: 'prepayment',
        2: 'advance',
        3: 'full_payment',
        4: 'partial_payment',
        5: 'credit',
        6: 'credit_payment'
    }
    
    # Measure mapping
    measure_mapping = {
        'PIECE': 0, 'GRAM': 10, 'KILOGRAM': 11, 'TON': 12,
        'CENTIMETER': 20, 'DECIMETER': 21, 'METER': 22,
        'SQUARE_CENTIMETER': 30, 'SQUARE_DECIMETER': 31, 'SQUARE_METER': 32,
        'MILLILITER': 40, 'LITER': 41, 'CUBIC_METER': 42,
        'KILOWATT_HOUR': 50, 'GIGACALORIE': 51,
        'DAY': 70, 'HOUR': 71, 'MINUTE': 72, 'SECOND': 73,
        'KILOBYTE': 80, 'MEGABYTE': 81, 'GIGABYTE': 82, 'TERABYTE': 83,
        'OTHER': 255
    }
    
    # Convert items
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
            'vat': {'type': vat_type}
        }
        atol_items.append(atol_item)
    
    # Convert payments
    cashless_payments = receipt.get('CashlessPayments', [])
    atol_payments = []
    
    for payment in cashless_payments:
        payment_sum = float(payment.get('PaymentSum', 0))
        atol_payments.append({'type': 1, 'sum': payment_sum})
    
    if not atol_payments:
        total = sum(item['sum'] for item in atol_items)
        atol_payments.append({'type': 1, 'sum': total})
    
    # Taxation system mapping
    taxation_system_mapping = {
        'Common': 'osn',
        'Simplified': 'usn_income',
        'SimplifiedWithExpenses': 'usn_income_outcome',
        'Unified': 'envd',
        'Patent': 'patent',
        'UnifiedAgricultural': 'esn'
    }
    
    sno = taxation_system_mapping.get(receipt.get('TaxationSystem', 'Common'), 'osn')
    
    # Operation mapping
    operation_mapping = {
        'Income': 'sell',
        'IncomeReturn': 'sell_refund',
        'Outcome': 'buy',
        'OutcomeReturn': 'buy_refund',
        'IncomeCorrection': 'sell_correction',
        'SellCorrection': 'sell_correction',
        'OutcomeCorrection': 'buy_correction',
        'BuyCorrection': 'buy_correction'
    }
    
    operation = operation_mapping.get(ferma_request.get('Type', 'Income'), 'sell')
    
    # Client info
    client_info = {}
    if receipt.get('Email'):
        client_info['email'] = receipt['Email']
    if receipt.get('Phone'):
        client_info['phone'] = receipt['Phone']
    
    timestamp = datetime.now().strftime('%d.%m.%Y %H:%M:%S')
    
    # Build eKomKassa payload
    ekomkassa_payload = {
        'timestamp': timestamp,
        'external_id': ferma_request.get('InvoiceId', str(int(time.time()))),
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
    
    ekomkassa_url = f'https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/{operation}'
    
    logger.info(f"[RECEIPT] Request to eKomKassa: {ekomkassa_url}")
    logger.info(f"[RECEIPT] Payload: {json.dumps(ekomkassa_payload, ensure_ascii=False)}")
    
    try:
        response = requests.post(
            ekomkassa_url,
            json=ekomkassa_payload,
            headers={
                'Content-Type': 'application/json',
                'Token': token
            },
            timeout=15
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[RECEIPT] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        try:
            response_json = response.json()
        except:
            response_json = {'raw': response.text}
        
        log_to_db('receipt', 'INFO', 'eKomKassa receipt response received',
                  request_data={'operation': operation, 'group_code': group_code},
                  response_data=response_json,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        flask_response = app.response_class(
            response=response.text,
            status=response.status_code,
            mimetype='application/json'
        )
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response
        
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[RECEIPT] eKomKassa API error: {str(e)}")
        log_to_db('receipt', 'ERROR', f'eKomKassa API error: {str(e)}',
                  request_data={'operation': operation, 'group_code': group_code},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        return jsonify({'error': f'eKomKassa API error: {str(e)}'}), 500


def convert_simple_format(body_data: Dict[str, Any], start_time: float, request_id: Optional[str]):
    '''Упрощённый формат (прямая проксация в eKomKassa)'''
    
    token = body_data.get('token')
    group_code = body_data.get('group_code', '700')
    operation = body_data.get('operation', 'sell')
    
    if not token:
        return jsonify({'error': 'Token required'}), 401
    
    receipt_data = body_data.get('receipt', {})
    
    if not receipt_data:
        return jsonify({'error': 'Receipt data required'}), 400
    
    ekomkassa_url = f'https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/{operation}'
    
    logger.info(f"[RECEIPT-SIMPLE] Request to eKomKassa: {ekomkassa_url}")
    
    try:
        response = requests.post(
            ekomkassa_url,
            json=body_data,
            headers={
                'Content-Type': 'application/json',
                'Token': token
            },
            timeout=15
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[RECEIPT-SIMPLE] Response: status={response.status_code}, body={response.text}")
        
        try:
            response_json = response.json()
        except:
            response_json = {'raw': response.text}
        
        log_to_db('receipt', 'INFO', 'Simple format receipt response',
                  request_data={'operation': operation, 'group_code': group_code},
                  response_data=response_json,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        flask_response = app.response_class(
            response=response.text,
            status=response.status_code,
            mimetype='application/json'
        )
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response
        
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[RECEIPT-SIMPLE] eKomKassa API error: {str(e)}")
        log_to_db('receipt', 'ERROR', f'Simple format API error: {str(e)}',
                  request_data={'operation': operation, 'group_code': group_code},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        return jsonify({'error': f'eKomKassa API error: {str(e)}'}), 500


# ============================================
# AUTH ENDPOINTS FOR WEB INTERFACE
# ============================================
@app.route('/api/admin/login', methods=['POST', 'OPTIONS'])
def admin_login():
    '''Login endpoint for admin panel'''
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response, 200
    
    body_data = request.get_json(silent=True) or {}
    login = body_data.get('login')
    password = body_data.get('password')
    
    logger.info(f"[ADMIN] Login attempt: login={login}")
    
    if login == ADMIN_LOGIN and password == ADMIN_PASSWORD:
        session['authenticated'] = True
        session['login'] = login
        logger.info(f"[ADMIN] Login successful: {login}")
        
        response = jsonify({'success': True, 'message': 'Authentication successful'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200
    else:
        logger.warning(f"[ADMIN] Login failed: {login}")
        response = jsonify({'success': False, 'message': 'Invalid credentials'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 401

@app.route('/api/admin/logout', methods=['POST', 'OPTIONS'])
def admin_logout():
    '''Logout endpoint for admin panel'''
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response, 200
    
    session.clear()
    logger.info("[ADMIN] User logged out")
    
    response = jsonify({'success': True, 'message': 'Logged out successfully'})
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response, 200

@app.route('/api/admin/check', methods=['GET'])
def admin_check():
    '''Check if user is authenticated'''
    is_authenticated = session.get('authenticated', False)
    
    response = jsonify({
        'authenticated': is_authenticated,
        'login': session.get('login') if is_authenticated else None
    })
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response, 200

@app.route('/api/logs', methods=['GET'])
@require_auth
def get_logs():
    '''Get logs from database with pagination and filtering'''
    try:
        if not DATABASE_URL:
            return jsonify({'error': 'Database not configured'}), 500
        
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        function_name = request.args.get('function')
        log_level = request.args.get('level')
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        query = "SELECT id, timestamp, function_name, log_level, message, request_id, duration_ms, status_code FROM logs WHERE 1=1"
        params = []
        
        if function_name:
            query += " AND function_name = %s"
            params.append(function_name)
        
        if log_level:
            query += " AND log_level = %s"
            params.append(log_level)
        
        query += " ORDER BY timestamp DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        logs = []
        for row in rows:
            logs.append({
                'id': row[0],
                'timestamp': row[1].isoformat() if row[1] else None,
                'function_name': row[2],
                'log_level': row[3],
                'message': row[4],
                'request_id': row[5],
                'duration_ms': row[6],
                'status_code': row[7]
            })
        
        cur.close()
        conn.close()
        
        response = jsonify({'logs': logs, 'count': len(logs)})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200
        
    except Exception as e:
        logger.error(f"Failed to fetch logs: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Health check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()}), 200


# ============================================
# STATIC FILES (WEB INTERFACE)
# ============================================
@app.route('/')
def serve_index():
    '''Serve the web interface index.html'''
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    '''Serve static files (JS, CSS, images) or SPA routes'''
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    # Development mode
    app.run(host='0.0.0.0', port=5000, debug=False)