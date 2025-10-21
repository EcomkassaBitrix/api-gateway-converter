import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для получения логов из базы данных
    Args: event - dict with httpMethod, queryStringParameters
          context - object with request_id
    Returns: JSON array with log entries
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
    limit = int(params.get('limit', '100'))
    function_name = params.get('function_name')
    log_level = params.get('log_level')
    
    try:
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Database not configured'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        query = 'SELECT id, created_at, function_name, log_level, message, request_data, response_data, request_id, duration_ms, status_code FROM logs'
        conditions = []
        
        if function_name:
            conditions.append(f"function_name = '{function_name}'")
        
        if log_level:
            conditions.append(f"log_level = '{log_level}'")
        
        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)
        
        query += f' ORDER BY created_at DESC LIMIT {limit}'
        
        cur.execute(query)
        
        columns = [desc[0] for desc in cur.description]
        results = []
        
        for row in cur.fetchall():
            log_entry = {}
            for i, value in enumerate(row):
                if columns[i] == 'created_at' and value:
                    log_entry[columns[i]] = value.isoformat()
                elif columns[i] in ('request_data', 'response_data') and value:
                    log_entry[columns[i]] = json.loads(value) if isinstance(value, str) else value
                else:
                    log_entry[columns[i]] = value
            results.append(log_entry)
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps(results),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
