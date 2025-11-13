import json
import requests
import logging
import os
import time
import psycopg2
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    Business: Ferma-совместимый API для получения токена авторизации
    Ferma URL: POST https://ferma.ofd.ru/api/Authorization/CreateAuthToken
    Gateway URL: POST https://{gateway}/api/Authorization/CreateAuthToken
    Target: https://app.ecomkassa.ru/fiscalorder/v5/getToken
    Request: {"login": "...", "password": "..."}
    Response: eKomKassa token response
    '''
    start_time = time.time()
    request_id = getattr(context, 'request_id', None)
    method: str = event.get('httpMethod', 'GET')
    headers = event.get('headers', {})
    
    # Проверяем, запрос от веб-интерфейса (песочницы) на poehali.dev
    origin = headers.get('Origin', '').lower()
    referer = headers.get('Referer', '').lower()
    is_web_debug = (
        headers.get('X-Debug-Mode') == 'true' or 
        'poehali.dev' in origin or 
        'poehali.dev' in referer or
        'localhost' in origin or
        'localhost' in referer
    )
    
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
    
    body_str = event.get('body')
    if not body_str or (isinstance(body_str, str) and body_str.strip() == ''):
        body_data = {}
    else:
        try:
            body_data = json.loads(body_str) if isinstance(body_str, str) else body_str
        except (json.JSONDecodeError, ValueError):
            body_data = {}
    
    # Поддержка разных регистров параметров
    login = body_data.get('Login') or body_data.get('login')
    password = body_data.get('Password') or body_data.get('password')
    
    logger.info(f"[AUTH] Incoming request: login={login}, password={'***' if password else None}")
    log_to_db('ekomkassa-auth', 'INFO', 'Incoming auth request', 
              request_data={'login': login, 'has_password': bool(password)}, 
              request_id=request_id)
    
    if not login or not password:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'login and password required'}),
            'isBase64Encoded': False
        }
    
    try:
        request_payload = {'login': login, 'pass': password}
        logger.info(f"[AUTH] Request to eKomKassa: {json.dumps({'login': login, 'pass': '***'})}")
        log_to_db('ekomkassa-auth', 'INFO', 'Request to eKomKassa',
                  request_data={'login': login, 'endpoint': 'getToken'},
                  request_id=request_id)
        
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
        
        if response.status_code == 200 and isinstance(response_json, dict) and response_json.get('token'):
            ferma_response = {
                'Status': 'Success',
                'Data': {
                    'AuthToken': response_json['token'],
                    'ExpirationDateUtc': '2099-12-31T23:59:59'
                }
            }
            
            # Для веб-интерфейса (песочницы) добавляем отладочную информацию
            if is_web_debug:
                ferma_response['ekomkassa_response'] = response_json
            
            logger.info(f"[SUCCESS] Returning Ferma response: {json.dumps(ferma_response)}")
            log_to_db('ekomkassa-auth', 'INFO', 'eKomKassa auth response received',
                      request_data={'login': login},
                      response_data={'ferma_format': ferma_response, 'ekomkassa_raw': response_json},
                      request_id=request_id,
                      duration_ms=duration_ms,
                      status_code=200)
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps(ferma_response),
                'isBase64Encoded': False
            }
        else:
            error_code = response.status_code
            error_message = 'Authentication failed'
            
            if isinstance(response_json, dict):
                if 'code' in response_json and 'text' in response_json:
                    error_code = response_json['code']
                    error_message = response_json['text']
                elif response_json.get('error'):
                    error_obj = response_json['error']
                    if isinstance(error_obj, dict):
                        error_code = error_obj.get('code', response.status_code)
                        error_message = error_obj.get('text', error_message)
                    elif isinstance(error_obj, str):
                        error_message = error_obj
            
            ferma_error = {
                'Status': 'Failed',
                'Error': {
                    'Code': error_code,
                    'Message': error_message
                }
            }
            log_to_db('ekomkassa-auth', 'ERROR', 'eKomKassa auth error response received',
                      request_data={'login': login},
                      response_data={'ferma_format': ferma_error, 'ekomkassa_raw': response_json},
                      request_id=request_id,
                      duration_ms=duration_ms,
                      status_code=response.status_code)
            return {
                'statusCode': response.status_code,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps(ferma_error),
                'isBase64Encoded': False
            }
    except requests.RequestException as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(f"[AUTH] eKomKassa API error: {str(e)}")
        ferma_error = {
            'Status': 'Failed',
            'Error': {
                'Code': 500,
                'Message': f'eKomKassa API error: {str(e)}'
            }
        }
        log_to_db('ekomkassa-auth', 'ERROR', f'eKomKassa API error: {str(e)}',
                  request_data={'login': login},
                  response_data=ferma_error,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps(ferma_error),
            'isBase64Encoded': False
        }