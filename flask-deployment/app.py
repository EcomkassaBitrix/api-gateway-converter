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
from collections import OrderedDict

# Определяем абсолютный путь к dist папке
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_FOLDER = os.path.join(BASE_DIR, 'dist')

# Отключаем встроенный обработчик статики Flask (static_folder=None)
# Чтобы наши кастомные роуты работали правильно для SPA
app = Flask(__name__, static_folder=None, static_url_path=None)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'ecomkassa-gateway-secret-key-2025')
app.json.sort_keys = False  # Сохраняем порядок ключей в JSON

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

# eKomKassa environment: 'production' or 'sandbox'
EKOMKASSA_ENV = os.environ.get('EKOMKASSA_ENV', 'sandbox')

# eKomKassa URLs
if EKOMKASSA_ENV == 'production':
    EKOMKASSA_BASE_URL = 'https://gw.ecomkassa.ru'
    EKOMKASSA_AUTH_URL = f'{EKOMKASSA_BASE_URL}/api/Authorization/CreateAuthToken'
    EKOMKASSA_RECEIPT_URL_TEMPLATE = f'{EKOMKASSA_BASE_URL}/api/kkt/cloud/receipt'
    EKOMKASSA_STATUS_URL_TEMPLATE = f'{EKOMKASSA_BASE_URL}/api/kkt/cloud/status'
else:
    EKOMKASSA_BASE_URL = 'https://app.ecomkassa.ru'
    EKOMKASSA_AUTH_URL = f'{EKOMKASSA_BASE_URL}/fiscalorder/v5/getToken'
    EKOMKASSA_RECEIPT_URL_TEMPLATE = f'{EKOMKASSA_BASE_URL}/fiscalorder/v5/{{group_code}}/{{operation}}'
    EKOMKASSA_STATUS_URL_TEMPLATE = f'{EKOMKASSA_BASE_URL}/fiscalorder/v5/{{group_code}}/report/{{uuid}}'

logger.info(f'eKomKassa environment: {EKOMKASSA_ENV}')
logger.info(f'eKomKassa auth URL: {EKOMKASSA_AUTH_URL}')

# Admin credentials
ADMIN_LOGIN = 'admin'
ADMIN_PASSWORD = 'GatewayEcomkassa'

def create_ferma_response(status: str, data: Optional[Dict] = None, error: Optional[Dict] = None) -> OrderedDict:
    '''Helper function to create Ferma-compatible response with guaranteed field order'''
    response = OrderedDict()
    response['Status'] = status
    if data is not None:
        response['Data'] = data
    if error is not None:
        response['Error'] = error
    return response

def require_auth(f):
    '''Decorator for routes that require authentication'''
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def log_request_to_db(
    method: str,
    url: str,
    path: str,
    source_ip: str,
    user_agent: str,
    request_headers: Dict,
    request_body: Any,
    target_url: Optional[str] = None,
    target_method: Optional[str] = None,
    target_headers: Optional[Dict] = None,
    target_body: Any = None,
    response_status: Optional[int] = None,
    response_headers: Optional[Dict] = None,
    response_body: Any = None,
    client_response_status: Optional[int] = None,
    client_response_body: Any = None,
    duration_ms: Optional[int] = None,
    error_message: Optional[str] = None,
    request_id: Optional[str] = None
) -> None:
    '''Полное логирование запроса в БД'''
    try:
        if not DATABASE_URL:
            return
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute(
            """
            INSERT INTO request_logs (
                method, url, path, source_ip, user_agent,
                request_headers, request_body,
                target_url, target_method, target_headers, target_body,
                response_status, response_headers, response_body,
                client_response_status, client_response_body,
                duration_ms, error_message, request_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                method, url, path, source_ip, user_agent,
                json.dumps(request_headers) if request_headers else None,
                json.dumps(request_body) if request_body else None,
                target_url, target_method,
                json.dumps(target_headers) if target_headers else None,
                json.dumps(target_body) if target_body else None,
                response_status,
                json.dumps(response_headers) if response_headers else None,
                json.dumps(response_body) if response_body else None,
                client_response_status,
                json.dumps(client_response_body) if client_response_body else None,
                duration_ms, error_message, request_id
            )
        )
        
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to write request log to DB: {str(e)}")


def log_to_db(function_name: str, log_level: str, message: str, 
              request_data: Optional[Dict] = None, response_data: Optional[Dict] = None,
              request_id: Optional[str] = None, duration_ms: Optional[int] = None,
              status_code: Optional[int] = None) -> None:
    '''Старая функция логирования для обратной совместимости'''
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


def proxy_and_log(target_url: str, target_method: str = None) -> tuple:
    '''
    Универсальная функция для проксирования запроса с полным логированием
    Возвращает (response_json, status_code)
    '''
    start_time = time.time()
    request_id = request.headers.get('X-Request-ID', f'req_{int(time.time() * 1000)}')
    
    # Информация о входящем запросе
    method = request.method
    url = request.url
    path = request.path
    source_ip = request.headers.get('X-Real-IP', request.remote_addr)
    user_agent = request.headers.get('User-Agent', '')
    request_headers = dict(request.headers)
    request_body = request.get_json(silent=True) or {}
    
    # Для проксирования используем метод запроса или переданный
    if target_method is None:
        target_method = method
    
    response_status = None
    response_headers = None
    response_body = None
    client_response_status = None
    client_response_body = None
    error_message = None
    
    try:
        # Подготовка заголовков для проксирования
        proxy_headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'eKomKassa-Gateway/1.0'
        }
        
        # Отправка запроса к целевому API
        logger.info(f"[PROXY] {method} {path} -> {target_method} {target_url}")
        
        if target_method == 'GET':
            resp = requests.get(target_url, headers=proxy_headers, params=request.args, timeout=30)
        else:
            resp = requests.post(target_url, headers=proxy_headers, json=request_body, timeout=30)
        
        response_status = resp.status_code
        response_headers = dict(resp.headers)
        
        try:
            response_body = resp.json()
        except:
            response_body = {'raw': resp.text}
        
        # Формируем ответ клиенту
        client_response_status = response_status
        client_response_body = response_body
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Логируем всё в БД
        log_request_to_db(
            method=method, url=url, path=path,
            source_ip=source_ip, user_agent=user_agent,
            request_headers=request_headers, request_body=request_body,
            target_url=target_url, target_method=target_method,
            target_headers=proxy_headers, target_body=request_body,
            response_status=response_status,
            response_headers=response_headers,
            response_body=response_body,
            client_response_status=client_response_status,
            client_response_body=client_response_body,
            duration_ms=duration_ms,
            request_id=request_id
        )
        
        return client_response_body, client_response_status
        
    except requests.exceptions.RequestException as e:
        error_message = str(e)
        client_response_status = 502
        client_response_body = {'error': 'Gateway error', 'message': error_message}
        duration_ms = int((time.time() - start_time) * 1000)
        
        logger.error(f"[PROXY] Error: {error_message}")
        
        # Логируем ошибку
        log_request_to_db(
            method=method, url=url, path=path,
            source_ip=source_ip, user_agent=user_agent,
            request_headers=request_headers, request_body=request_body,
            target_url=target_url, target_method=target_method,
            target_headers=proxy_headers, target_body=request_body,
            client_response_status=client_response_status,
            client_response_body=client_response_body,
            duration_ms=duration_ms,
            error_message=error_message,
            request_id=request_id
        )
        
        return client_response_body, client_response_status


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
    # Ferma формат использует Login и Password с заглавной буквы
    login = body_data.get('Login') or body_data.get('login')
    password = body_data.get('Password') or body_data.get('password')
    
    logger.info(f"[AUTH] Incoming request: Login={login}, Password={'***' if password else None}")
    log_to_db('auth', 'INFO', 'Incoming auth request', 
              request_data={'Login': login, 'has_password': bool(password)}, 
              request_id=request_id)
    
    if not login or not password:
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': 400,
                'Message': 'Login и Password обязательны'
            }
        }
        flask_response = jsonify(ferma_error)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 400
    
    try:
        request_payload = {'login': login, 'pass': password}
        logger.info(f"[AUTH] Request to eKomKassa: {json.dumps({'login': login, 'pass': '***'})}")
        
        response = requests.post(
            EKOMKASSA_AUTH_URL,
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
        
        # Конвертируем в формат Атол/Ferma
        if response.status_code == 200 and isinstance(response_json, dict) and response_json.get('token'):
            ferma_response = create_ferma_response(
                status='Success',
                data={
                    'AuthToken': response_json['token'],
                    'ExpirationDateUtc': '2099-12-31T23:59:59'
                }
            )
            client_status = 200
        else:
            # В случае ошибки возвращаем формат с Status Failed и Error
            error_code = 2
            error_message = 'Авторизация невозможна. Неверные учетные данные'
            
            if isinstance(response_json, dict):
                if response_json.get('code') is not None:
                    error_code = response_json['code']
                if response_json.get('text'):
                    error_message = response_json['text']
                elif response_json.get('error'):
                    error_obj = response_json['error']
                    if isinstance(error_obj, dict):
                        error_code = error_obj.get('code', error_code)
                        error_message = error_obj.get('text', str(error_obj))
                    elif isinstance(error_obj, str):
                        error_message = error_obj
            
            ferma_response = create_ferma_response(
                status='Failed',
                error={
                    'Code': error_code,
                    'Message': error_message
                }
            )
            client_status = 401
        
        log_to_db('auth', 'INFO', 'eKomKassa response received',
                  request_data={'login': login},
                  response_data={'ferma_format': ferma_response, 'ekomkassa_raw': response_json},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        # Логируем в request_logs
        log_request_to_db(
            method=request.method,
            url=request.url,
            path=request.path,
            source_ip=request.headers.get('X-Real-IP', request.remote_addr),
            user_agent=request.headers.get('User-Agent', ''),
            request_headers=dict(request.headers),
            request_body=body_data,
            target_url=EKOMKASSA_AUTH_URL,
            target_method='POST',
            target_headers={'Content-Type': 'application/json'},
            target_body=request_payload,
            response_status=response.status_code,
            response_headers=dict(response.headers),
            response_body=response_json,
            client_response_status=client_status,
            client_response_body=ferma_response,
            duration_ms=duration_ms,
            request_id=request_id
        )
        
        flask_response = jsonify(ferma_response)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, client_status
        
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        logger.error(f"[AUTH] eKomKassa API error: {error_msg}")
        
        ferma_error_response = {
            'Status': 'Failed',
            'Error': {
                'Code': 500,
                'Message': f'Ошибка подключения к сервису кассы: {error_msg}'
            }
        }
        
        log_to_db('auth', 'ERROR', f'eKomKassa API error: {error_msg}',
                  request_data={'login': login},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        
        # Логируем ошибку в request_logs
        log_request_to_db(
            method=request.method,
            url=request.url,
            path=request.path,
            source_ip=request.headers.get('X-Real-IP', request.remote_addr),
            user_agent=request.headers.get('User-Agent', ''),
            request_headers=dict(request.headers),
            request_body=body_data,
            target_url=EKOMKASSA_AUTH_URL,
            target_method='POST',
            client_response_status=500,
            client_response_body=ferma_error_response,
            duration_ms=duration_ms,
            error_message=error_msg,
            request_id=request_id
        )
        
        flask_response = jsonify(ferma_error_response)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 500


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
    
    # Ferma использует AuthToken, GroupCode, uuid
    auth_token = request.args.get('AuthToken') or request.args.get('token')
    group_code = (request.args.get('GroupCode') or request.args.get('group_code', '700')).lower()
    uuid = request.args.get('uuid') or request.args.get('Uuid')
    
    logger.info(f"[STATUS] Incoming request: uuid={uuid}, GroupCode={group_code}, AuthToken={'***' if auth_token else None}")
    log_to_db('status', 'INFO', 'Incoming status check request',
              request_data={'uuid': uuid, 'GroupCode': group_code, 'has_token': bool(auth_token)},
              request_id=request_id)
    
    if not auth_token:
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': 401,
                'Message': 'AuthToken обязателен'
            }
        }
        flask_response = jsonify(ferma_error)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 401
    
    if not uuid:
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': 400,
                'Message': 'uuid обязателен'
            }
        }
        flask_response = jsonify(ferma_error)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 400
    
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
        
        # Конвертируем в формат Атол/Ferma
        if response.status_code == 200 and isinstance(response_json, dict):
            # Маппинг статусов eKomKassa -> Ferma
            status_code = 0  # NEW по умолчанию
            status_name = 'NEW'
            status_message = 'Запрос на чек получен'
            
            ekomkassa_status = response_json.get('status', 'wait')
            
            if ekomkassa_status == 'done':
                status_code = 1
                status_name = 'PROCEED'
                status_message = 'Чек сформирован на кассе'
            elif ekomkassa_status == 'wait':
                status_code = 0
                status_name = 'NEW'
                status_message = 'Запрос на чек получен'
            elif ekomkassa_status == 'error' or ekomkassa_status == 'fail':
                status_code = 2
                status_name = 'ERROR'
                # Для fail берём текст ошибки из разных мест
                error_message = 'Ошибка создания чека'
                if response_json.get('error'):
                    if isinstance(response_json['error'], dict):
                        error_message = response_json['error'].get('text', error_message)
                    else:
                        error_message = str(response_json['error'])
                elif response_json.get('message'):
                    error_message = response_json['message']
                status_message = error_message
            
            # Конвертируем даты из формата "01.11.2025 11:50:12" в ISO с миллисекундами и таймзоной
            def convert_date_to_iso(date_str):
                if not date_str:
                    return None
                try:
                    # Парсим формат "01.11.2025 11:50:12"
                    dt = datetime.strptime(date_str, '%d.%m.%Y %H:%M:%S')
                    # Добавляем миллисекунды и таймзону: "2025-11-01T12:05:58.000+03:00[Europe/Moscow]"
                    return f"{dt.isoformat()}.000+03:00[Europe/Moscow]"
                except:
                    return date_str
            
            timestamp = response_json.get('timestamp')
            now_iso = f"{datetime.now().isoformat()}.000+03:00[Europe/Moscow]"
            modified_date_iso = convert_date_to_iso(timestamp) if timestamp else now_iso
            
            # Получаем payload для извлечения данных
            payload = response_json.get('payload', {})
            
            # ReceiptDateUtc берём из receipt_datetime (если done) или timestamp
            receipt_datetime_str = None
            if ekomkassa_status == 'done' and payload.get('receipt_datetime'):
                receipt_datetime_str = payload['receipt_datetime']
            elif timestamp:
                receipt_datetime_str = timestamp
            
            receipt_date_iso = convert_date_to_iso(receipt_datetime_str) if receipt_datetime_str else None
            
            ferma_data = {
                'StatusCode': status_code,
                'StatusName': status_name,
                'StatusMessage': status_message,
                'ModifiedDateUtc': modified_date_iso,
                'ReceiptDateUtc': receipt_date_iso,
                'ModifiedDateTimeIso': modified_date_iso,
                'ReceiptDateTimeIso': receipt_date_iso,
                'ReceiptId': uuid,
                'Device': None
            }
            
            # Добавляем информацию об устройстве из payload
            if payload:
                # OfdReceiptUrl берём из permalink (приоритет) или ofd_receipt_url
                ofd_url = response_json.get('permalink') or payload.get('ofd_receipt_url') or None
                
                ferma_data['Device'] = {
                    'DeviceId': payload.get('kkt_reg_id') or None,
                    'RNM': payload.get('ecr_registration_number') or None,  # Регистрационный номер ККТ
                    'ZN': payload.get('serial_number') or None,  # Заводской номер
                    'FN': payload.get('fn_number') or None,  # Номер ФН
                    'FDN': str(payload.get('fiscal_document_number')) if payload.get('fiscal_document_number') else None,  # Номер ФД
                    'FPD': str(payload.get('fiscal_document_attribute')) if payload.get('fiscal_document_attribute') else None,  # ФПД
                    'ShiftNumber': payload.get('shift_number') or None,  # Номер смены
                    'ReceiptNumInShift': payload.get('fiscal_receipt_number') or None,  # Номер чека в смене
                    'DeviceType': None,
                    'OfdReceiptUrl': ofd_url
                }
            
            ferma_response = create_ferma_response(status='Success', data=ferma_data)
            client_status = 200
            
        elif response.status_code == 404 or (isinstance(response_json, dict) and 
                                             response_json.get('error', {}).get('code') == 31):
            # Документ не найден
            ferma_response = create_ferma_response(
                status='Failed',
                error={'Code': 1004, 'Message': 'Документ не найден'}
            )
            client_status = 404
        else:
            # Другие ошибки
            error_code = 1000
            error_message = 'Ошибка получения статуса'
            
            if isinstance(response_json, dict) and response_json.get('error'):
                error_obj = response_json['error']
                if isinstance(error_obj, dict):
                    error_code = error_obj.get('code', error_code)
                    error_message = error_obj.get('text', error_message)
                elif isinstance(error_obj, str):
                    error_message = error_obj
            
            ferma_response = create_ferma_response(
                status='Failed',
                error={'Code': error_code, 'Message': error_message}
            )
            client_status = response.status_code
        
        log_to_db('status', 'INFO', 'eKomKassa status response received',
                  request_data={'uuid': uuid, 'group_code': group_code},
                  response_data={'ferma_format': ferma_response, 'ekomkassa_raw': response_json},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        flask_response = jsonify(ferma_response)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, client_status
        
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        logger.error(f"[STATUS] eKomKassa API error: {error_msg}")
        
        ferma_error_response = {
            'Status': 'Failed',
            'Error': {
                'Code': 500,
                'Message': f'Ошибка подключения к сервису кассы: {error_msg}'
            }
        }
        
        log_to_db('status', 'ERROR', f'eKomKassa API error: {error_msg}',
                  request_data={'uuid': uuid, 'group_code': group_code},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        
        flask_response = jsonify(ferma_error_response)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 500


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
    
    # Ferma формат использует Request с заглавной буквы
    ferma_request = body_data.get('Request')
    # AuthToken или token (совместимость)
    auth_token = body_data.get('AuthToken') or body_data.get('token')
    # GroupCode или group_code (совместимость)
    group_code = (body_data.get('GroupCode') or body_data.get('group_code', '700')).lower()
    
    if ferma_request:
        result = convert_ferma_to_ekomkassa(ferma_request, auth_token, 
                                           group_code, 
                                           start_time, request_id)
    else:
        result = convert_simple_format(body_data, start_time, request_id)
    
    return result


def convert_ferma_to_ekomkassa(ferma_request: Dict[str, Any], token: Optional[str], 
                               group_code: str, start_time: float, request_id: Optional[str]):
    '''Конвертация полного формата Ferma API в eKomKassa'''
    
    # Определяем operation в самом начале для использования в логах
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
    
    if not token:
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': 401,
                'Message': 'AuthToken обязателен'
            }
        }
        flask_response = jsonify(ferma_error)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 401
    
    receipt = ferma_request.get('CustomerReceipt', {})
    items = receipt.get('Items', [])
    
    if not items:
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': 400,
                'Message': 'Items обязательны в чеке'
            }
        }
        flask_response = jsonify(ferma_error)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 400
    
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
        
        # Конвертируем в формат Атол/Ferma
        if response.status_code == 200 and isinstance(response_json, dict):
            if response_json.get('uuid'):
                # Успешное создание чека
                ferma_response = create_ferma_response(
                    status='Success',
                    data={'ReceiptId': response_json['uuid']}
                )
                client_status = 200
            elif response_json.get('error'):
                # Ошибка от eKomKassa
                error_obj = response_json['error']
                error_code = error_obj.get('code', 1000) if isinstance(error_obj, dict) else 1000
                error_message = error_obj.get('text', str(error_obj)) if isinstance(error_obj, dict) else str(error_obj)
                
                ferma_response = create_ferma_response(
                    status='Failed',
                    error={'Code': error_code, 'Message': error_message}
                )
                client_status = 400
            else:
                # Неизвестный формат ответа
                ferma_response = {
                    'Status': 'Failed',
                    'Error': {
                        'Code': 1000,
                        'Message': 'Неизвестный формат ответа от кассы'
                    }
                }
                client_status = 500
        else:
            # HTTP ошибка
            error_message = 'Ошибка создания чека'
            error_code = response.status_code
            
            if isinstance(response_json, dict) and response_json.get('error'):
                error_obj = response_json['error']
                if isinstance(error_obj, dict):
                    error_code = error_obj.get('code', error_code)
                    error_message = error_obj.get('text', error_message)
                elif isinstance(error_obj, str):
                    error_message = error_obj
            
            ferma_response = {
                'Status': 'Failed',
                'Error': {
                    'Code': error_code,
                    'Message': error_message
                }
            }
            client_status = response.status_code
        
        log_to_db('receipt', 'INFO', 'eKomKassa receipt response received',
                  request_data={'operation': operation, 'group_code': group_code},
                  response_data={'ferma_format': ferma_response, 'ekomkassa_raw': response_json},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        # Логируем в request_logs
        log_request_to_db(
            method='POST',
            url=request.url,
            path=request.path,
            source_ip=request.headers.get('X-Real-IP', request.remote_addr),
            user_agent=request.headers.get('User-Agent', ''),
            request_headers=dict(request.headers),
            request_body=ferma_request,
            target_url=ekomkassa_url,
            target_method='POST',
            target_headers={'Content-Type': 'application/json', 'Token': token},
            target_body=ekomkassa_payload,
            response_status=response.status_code,
            response_headers=dict(response.headers),
            response_body=response_json,
            client_response_status=client_status,
            client_response_body=ferma_response,
            duration_ms=duration_ms,
            request_id=request_id
        )
        
        flask_response = jsonify(ferma_response)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, client_status
        
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        logger.error(f"[RECEIPT] eKomKassa API error: {error_msg}")
        
        ferma_error_response = {
            'Status': 'Failed',
            'Error': {
                'Code': 500,
                'Message': f'Ошибка подключения к сервису кассы: {error_msg}'
            }
        }
        
        log_to_db('receipt', 'ERROR', f'eKomKassa API error: {error_msg}',
                  request_data={'operation': operation, 'group_code': group_code},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        
        flask_response = jsonify(ferma_error_response)
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        return flask_response, 500


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
        
        limit = int(request.args.get('limit', 500))
        offset = int(request.args.get('offset', 0))
        function_name = request.args.get('function')
        log_level = request.args.get('level')
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        query = "SELECT id, created_at, function_name, log_level, message, request_id, duration_ms, status_code FROM logs WHERE 1=1"
        params = []
        
        if function_name:
            query += " AND function_name = %s"
            params.append(function_name)
        
        if log_level:
            query += " AND log_level = %s"
            params.append(log_level)
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        logs = []
        for row in rows:
            logs.append({
                'id': row[0],
                'created_at': row[1].isoformat() if row[1] else None,
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


@app.route('/api/request-logs', methods=['GET'])
@require_auth
def get_request_logs():
    '''Получить полные логи запросов с возможностью фильтрации'''
    try:
        if not DATABASE_URL:
            return jsonify({'error': 'Database not configured'}), 500
        
        limit = int(request.args.get('limit', 500))
        offset = int(request.args.get('offset', 0))
        path_filter = request.args.get('path')
        status_filter = request.args.get('status')
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        query = """
            SELECT id, created_at, method, url, path, source_ip, 
                   request_body, target_url, response_status, response_body,
                   client_response_status, duration_ms, error_message, request_id
            FROM request_logs WHERE 1=1
        """
        params = []
        
        if path_filter:
            query += " AND path LIKE %s"
            params.append(f'%{path_filter}%')
        
        if status_filter:
            query += " AND client_response_status = %s"
            params.append(int(status_filter))
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cur.execute(query, params)
        rows = cur.fetchall()
        
        logs = []
        for row in rows:
            logs.append({
                'id': row[0],
                'created_at': row[1].isoformat() if row[1] else None,
                'method': row[2],
                'url': row[3],
                'path': row[4],
                'source_ip': row[5],
                'request_body': json.loads(row[6]) if row[6] else None,
                'target_url': row[7],
                'response_status': row[8],
                'response_body': json.loads(row[9]) if row[9] else None,
                'client_response_status': row[10],
                'duration_ms': row[11],
                'error_message': row[12],
                'request_id': row[13]
            })
        
        cur.close()
        conn.close()
        
        response = jsonify({'logs': logs, 'count': len(logs)})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200
        
    except Exception as e:
        logger.error(f"Failed to fetch request logs: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/request-logs/<int:log_id>', methods=['GET'])
@require_auth
def get_request_log_detail(log_id):
    '''Получить детальную информацию об одном запросе'''
    try:
        if not DATABASE_URL:
            return jsonify({'error': 'Database not configured'}), 500
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, created_at, method, url, path, source_ip, user_agent,
                   request_headers, request_body,
                   target_url, target_method, target_headers, target_body,
                   response_status, response_headers, response_body,
                   client_response_status, client_response_body,
                   duration_ms, error_message, request_id
            FROM request_logs WHERE id = %s
        """, (log_id,))
        
        row = cur.fetchone()
        
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Log not found'}), 404
        
        log_detail = {
            'id': row[0],
            'created_at': row[1].isoformat() if row[1] else None,
            'method': row[2],
            'url': row[3],
            'path': row[4],
            'source_ip': row[5],
            'user_agent': row[6],
            'request_headers': json.loads(row[7]) if row[7] else None,
            'request_body': json.loads(row[8]) if row[8] else None,
            'target_url': row[9],
            'target_method': row[10],
            'target_headers': json.loads(row[11]) if row[11] else None,
            'target_body': json.loads(row[12]) if row[12] else None,
            'response_status': row[13],
            'response_headers': json.loads(row[14]) if row[14] else None,
            'response_body': json.loads(row[15]) if row[15] else None,
            'client_response_status': row[16],
            'client_response_body': json.loads(row[17]) if row[17] else None,
            'duration_ms': row[18],
            'error_message': row[19],
            'request_id': row[20]
        }
        
        cur.close()
        conn.close()
        
        response = jsonify(log_detail)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200
        
    except Exception as e:
        logger.error(f"Failed to fetch request log detail: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/request-logs/<int:log_id>/replay', methods=['POST'])
@require_auth
def replay_request(log_id):
    '''Повторить запрос из истории'''
    try:
        if not DATABASE_URL:
            return jsonify({'error': 'Database not configured'}), 500
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT target_url, target_method, target_body
            FROM request_logs WHERE id = %s
        """, (log_id,))
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Log not found'}), 404
        
        target_url, target_method, target_body = row
        
        if not target_url:
            return jsonify({'error': 'No target URL in log'}), 400
        
        # Повторяем запрос
        start_time = time.time()
        headers = {'Content-Type': 'application/json'}
        
        try:
            body = json.loads(target_body) if target_body else {}
        except:
            body = {}
        
        try:
            if target_method == 'GET':
                resp = requests.get(target_url, headers=headers, timeout=30)
            else:
                resp = requests.post(target_url, headers=headers, json=body, timeout=30)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            try:
                response_body = resp.json()
            except:
                response_body = {'raw': resp.text}
            
            return jsonify({
                'success': True,
                'status': resp.status_code,
                'body': response_body,
                'duration_ms': duration_ms
            }), 200
            
        except requests.exceptions.RequestException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return jsonify({
                'success': False,
                'error': str(e),
                'duration_ms': duration_ms
            }), 502
        
    except Exception as e:
        logger.error(f"Failed to replay request: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Health check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()}), 200


# ============================================
# REQUEST LOGS WEB VIEW
# ============================================
@app.route('/request-logs')
def view_request_logs():
    '''Display request logs in HTML table'''
    try:
        if not DATABASE_URL:
            return "<h1>Database not configured</h1>", 500
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, created_at, method, path, source_ip, 
                   request_body, client_response_status, 
                   client_response_body, duration_ms
            FROM request_logs 
            ORDER BY id DESC 
            LIMIT 100
        """)
        
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        html = '''
<!DOCTYPE html>
<html>
<head>
    <title>Request Logs</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #4CAF50; color: white; padding: 12px; text-align: left; position: sticky; top: 0; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f9f9f9; }
        .json { font-family: monospace; font-size: 12px; max-width: 300px; overflow: auto; }
        .status-200 { color: green; font-weight: bold; }
        .status-500 { color: red; font-weight: bold; }
        .status-other { color: orange; font-weight: bold; }
    </style>
</head>
<body>
    <h1>📊 Request Logs (Last 100)</h1>
    <table>
        <tr>
            <th>ID</th>
            <th>Time</th>
            <th>Method</th>
            <th>Path</th>
            <th>IP</th>
            <th>Request Body</th>
            <th>Status</th>
            <th>Response Body</th>
            <th>Duration (ms)</th>
        </tr>
'''
        
        for row in rows:
            id_, created_at, method, path, source_ip, req_body, status, resp_body, duration = row
            
            status_class = 'status-200' if status == 200 else ('status-500' if status >= 500 else 'status-other')
            
            html += f'''
        <tr>
            <td>{id_}</td>
            <td>{created_at}</td>
            <td><strong>{method}</strong></td>
            <td>{path}</td>
            <td>{source_ip}</td>
            <td class="json">{req_body or '-'}</td>
            <td class="{status_class}">{status}</td>
            <td class="json">{resp_body or '-'}</td>
            <td>{duration or '-'}</td>
        </tr>
'''
        
        html += '''
    </table>
</body>
</html>
'''
        return html
        
    except Exception as e:
        logger.error(f"Failed to load request logs: {str(e)}")
        return f"<h1>Error loading logs</h1><p>{str(e)}</p>", 500


# ============================================
# STATIC FILES (WEB INTERFACE)
# ============================================
@app.route('/')
def serve_index():
    '''Serve the web interface index.html'''
    return send_from_directory(STATIC_FOLDER, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    '''Serve static files (JS, CSS, images) or SPA routes'''
    full_path = os.path.join(STATIC_FOLDER, path)
    if os.path.exists(full_path):
        return send_from_directory(STATIC_FOLDER, path)
    else:
        # Для всех SPA роутов возвращаем index.html
        return send_from_directory(STATIC_FOLDER, 'index.html')


if __name__ == '__main__':
    # Development mode
    app.run(host='0.0.0.0', port=5000, debug=False)