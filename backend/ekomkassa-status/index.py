import json
import requests
import logging
import os
import time
import psycopg2
from typing import Dict, Any, Optional, Tuple

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
    Business: Ferma-совместимый API для получения статуса чека
    Ferma URL: GET https://ferma.ofd.ru/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}
    Gateway URL: GET https://{gateway}/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}
    Target: https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/report/{uuid}
    Response: eKomKassa status response
    '''
    start_time = time.time()
    request_id = getattr(context, 'request_id', None)
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    auth_token = params.get('AuthToken')
    group_code = params.get('group_code', '700')
    uuid = params.get('uuid')
    login = params.get('login')
    password = params.get('password')
    
    logger.info(f"[STATUS] Incoming request: uuid={uuid}, group_code={group_code}, token={'***' if auth_token else None}")
    log_to_db('ekomkassa-status', 'INFO', 'Incoming status check request',
              request_data={'uuid': uuid, 'group_code': group_code, 'has_token': bool(auth_token)},
              request_id=request_id)
    
    if not auth_token:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'AuthToken required'}),
            'isBase64Encoded': False
        }
    
    if not uuid:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'uuid required'}),
            'isBase64Encoded': False
        }
    
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
            logger.error(f"[STATUS] Failed to refresh token: {str(e)}")
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
    
    def make_status_request(token: str) -> requests.Response:
        '''Make status request to eKomKassa'''
        ekomkassa_url = f'https://gw.ecomkassa.ru/fiscalorder/v5/{group_code}/report/{uuid}'
        logger.info(f"[STATUS] Request to eKomKassa: {ekomkassa_url}")
        return requests.get(
            ekomkassa_url,
            headers={
                'Content-Type': 'application/json',
                'Token': token
            },
            timeout=10
        )
    
    try:
        response = make_status_request(auth_token)
        
        if is_token_expired(response) and login and password:
            logger.info(f"[STATUS] Token expired, attempting refresh")
            new_token = refresh_token(login, password)
            if new_token:
                logger.info(f"[STATUS] Token refreshed, retrying request")
                response = make_status_request(new_token)
        
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"[STATUS] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        try:
            response_json = response.json()
        except:
            response_json = {'raw': response.text}
        
        log_to_db('ekomkassa-status', 'INFO', 'eKomKassa status response received',
                  request_data={'uuid': uuid, 'group_code': group_code},
                  response_data=response_json,
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=response.status_code)
        
        if response.status_code == 200 and isinstance(response_json, dict):
            status_mapping = {
                'wait': (0, 'NEW', 'Запрос на чек получен'),
                'done': (1, 'PROCESSED', 'Чек сформирован на кассе'),
                'fail': (2, 'ERROR', 'Ошибка создания чека')
            }
            
            ekomkassa_status = response_json.get('status', 'wait')
            status_code, status_name, status_message = status_mapping.get(ekomkassa_status, (0, 'UNKNOWN', 'Неизвестный статус'))
            
            payload = response_json.get('payload')
            receipt_datetime = payload.get('receipt_datetime') if payload else None
            
            ferma_data = {
                'StatusCode': status_code,
                'StatusName': status_name,
                'StatusMessage': status_message,
                'ModifiedDateUtc': response_json.get('timestamp'),
                'ReceiptDateUtc': receipt_datetime,
                'ModifiedDateTimeIso': response_json.get('timestamp'),
                'ReceiptDateTimeIso': receipt_datetime,
                'ReceiptId': uuid
            }
            
            if ekomkassa_status == 'done' and payload:
                ferma_data['Device'] = {
                    'DeviceId': None,
                    'RNM': payload.get('ecr_registration_number'),
                    'ZN': None,
                    'FN': payload.get('fn_number'),
                    'FDN': str(payload.get('fiscal_document_number')) if payload.get('fiscal_document_number') else None,
                    'FPD': str(payload.get('fiscal_document_attribute')) if payload.get('fiscal_document_attribute') else None,
                    'ShiftNumber': payload.get('shift_number'),
                    'ReceiptNumInShift': payload.get('fiscal_receipt_number'),
                    'DeviceType': None,
                    'OfdReceiptUrl': response_json.get('permalink')
                }
            else:
                ferma_data['Device'] = None
            
            ferma_response = {
                'Status': 'Success',
                'Data': ferma_data,
                'ekomkassa_response': response_json
            }
            
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps(ferma_response),
                'isBase64Encoded': False
            }
        else:
            error_code = response.status_code
            error_message = 'Unknown error'
            
            if isinstance(response_json, dict):
                if 'code' in response_json and 'text' in response_json:
                    error_code = response_json['code']
                    error_message = response_json['text']
                elif response_json.get('error'):
                    error_obj = response_json['error']
                    if isinstance(error_obj, dict):
                        error_code = error_obj.get('code', response.status_code)
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
        logger.error(f"[STATUS] eKomKassa API error: {str(e)}")
        log_to_db('ekomkassa-status', 'ERROR', f'eKomKassa API error: {str(e)}',
                  request_data={'uuid': uuid, 'group_code': group_code},
                  request_id=request_id,
                  duration_ms=duration_ms,
                  status_code=500)
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'eKomKassa API error: {str(e)}'}),
            'isBase64Encoded': False
        }