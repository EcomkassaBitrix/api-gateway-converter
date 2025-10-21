import json
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Ferma-совместимый эндпоинт авторизации
    Ferma URL: POST https://ferma.ofd.ru/api/Authorization/CreateAuthToken
    Gateway URL: POST https://{domain}/api/Authorization/CreateAuthToken
    Target: https://app.ecomkassa.ru/fiscalorder/v5/getToken
    Body: {"Login": "...", "Password": "..."}
    Returns: {"Status": "Success", "Data": {"AuthToken": "...", "ExpirationDateUtc": "..."}}
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
    
    if not login or not password:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'login and password required'}),
            'isBase64Encoded': False
        }
    
    try:
        response = requests.post(
            'https://app.ecomkassa.ru/fiscalorder/v5/getToken',
            json={'login': login, 'pass': password},
            headers={'Content-Type': 'application/json'},
            timeout=10
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