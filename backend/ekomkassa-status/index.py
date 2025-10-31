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
        ekomkassa_url = f'https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/report/{uuid}'
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
        
        if is_token_expired(response):
            logger.info(f"[STATUS] Token expired, attempting refresh")
            login = os.environ.get('EKOMKASSA_LOGIN')
            password = os.environ.get('EKOMKASSA_PASSWORD')
            
            if login and password:
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
        
        return {
            'statusCode': response.status_code,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': response.text,
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