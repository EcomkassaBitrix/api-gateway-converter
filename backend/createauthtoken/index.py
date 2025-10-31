import json
import urllib.request
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Авторизация через eKomKassa API
    Args: event - dict с httpMethod, body (login, password)
          context - object с request_id
    Returns: HTTP response с токеном или ошибкой
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Request-Id',
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
    
    body_str = event.get('body')
    if body_str is None or body_str == '':
        body_data = {}
    elif isinstance(body_str, str):
        try:
            body_data = json.loads(body_str)
        except json.JSONDecodeError:
            body_data = {}
    else:
        body_data = body_str
    
    login = body_data.get('login')
    password = body_data.get('password')
    
    if not login or not password:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'login and password required'}),
            'isBase64Encoded': False
        }
    
    try:
        request_payload = json.dumps({'login': login, 'pass': password}).encode('utf-8')
        
        req = urllib.request.Request(
            'https://app.ecomkassa.ru/fiscalorder/v5/getToken',
            data=request_payload,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            ekomkassa_data = json.loads(response.read().decode('utf-8'))
        
        ferma_response = {
            'Token': ekomkassa_data.get('Token'),
            'Status': {
                'StatusCode': ekomkassa_data.get('code', 0),
                'StatusMessage': ekomkassa_data.get('text', '')
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(ferma_response),
            'isBase64Encoded': False
        }
    except Exception as error:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'eKomKassa API error: {str(error)}'}),
            'isBase64Encoded': False
        }