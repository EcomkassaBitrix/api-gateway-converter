import json
import os
from typing import Dict, Any
import urllib.request
import urllib.error

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Конвертация Ferma AuthToken в eKomKassa getToken
    Args: event с httpMethod, body {login, password}
          context с request_id
    Returns: HTTP response с токеном eKomKassa
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
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
    
    raw_body = event.get('body', '{}')
    if not raw_body or raw_body == '':
        raw_body = '{}'
    
    body_data = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    login = body_data.get('login', '')
    password = body_data.get('password', '')
    
    if not login or not password:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'login and password are required'}),
            'isBase64Encoded': False
        }
    
    ekomkassa_request = {
        'login': login,
        'pass': password
    }
    
    ekomkassa_url = 'https://app.ecomkassa.ru/fiscalorder/v5/getToken'
    
    try:
        req = urllib.request.Request(
            ekomkassa_url,
            data=json.dumps(ekomkassa_request).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            response_data = response.read().decode('utf-8')
            ekomkassa_response = json.loads(response_data)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(ekomkassa_response),
            'isBase64Encoded': False
        }
    
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': error_body,
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }