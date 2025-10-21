import json
import requests
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Ferma-совместимый API для получения токена авторизации
    Ferma URL: POST https://ferma.ofd.ru/api/Authorization/CreateAuthToken
    Gateway URL: POST https://{gateway}/api/Authorization/CreateAuthToken
    Target: https://app.ecomkassa.ru/fiscalorder/v5/getToken
    Request: {"login": "...", "password": "..."}
    Response: eKomKassa token response
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
    
    body_str = event.get('body')
    if not body_str or (isinstance(body_str, str) and body_str.strip() == ''):
        body_data = {}
    else:
        try:
            body_data = json.loads(body_str) if isinstance(body_str, str) else body_str
        except (json.JSONDecodeError, ValueError):
            body_data = {}
    
    login = body_data.get('login')
    password = body_data.get('password')
    
    logger.info(f"[AUTH] Incoming request: login={login}, password={'***' if password else None}")
    
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
        
        response = requests.post(
            'https://app.ecomkassa.ru/fiscalorder/v5/getToken',
            json=request_payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        logger.info(f"[AUTH] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        return {
            'statusCode': response.status_code,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': response.text,
            'isBase64Encoded': False
        }
    except requests.RequestException as e:
        logger.error(f"[AUTH] eKomKassa API error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'eKomKassa API error: {str(e)}'}),
            'isBase64Encoded': False
        }