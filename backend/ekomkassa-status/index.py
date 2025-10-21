import json
import requests
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Ferma-совместимый API для получения статуса чека
    Ferma URL: GET https://ferma.ofd.ru/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}
    Gateway URL: GET https://{gateway}/api/kkt/cloud/status?uuid={uuid}&AuthToken={token}
    Target: https://app.ecomkassa.ru/fiscalorder/v5/{group_code}/report/{uuid}
    Response: eKomKassa status response
    '''
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
        
        logger.info(f"[STATUS] Response from eKomKassa: status={response.status_code}, body={response.text}")
        
        return {
            'statusCode': response.status_code,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': response.text,
            'isBase64Encoded': False
        }
    except requests.RequestException as e:
        logger.error(f"[STATUS] eKomKassa API error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'eKomKassa API error: {str(e)}'}),
            'isBase64Encoded': False
        }