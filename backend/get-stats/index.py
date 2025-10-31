import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get real-time statistics from logs table
    Args: event with httpMethod
    Returns: JSON with total requests, successful, errors, avg duration
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
    
    cur.execute("""
        SELECT 
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as successful_requests,
          COUNT(*) FILTER (WHERE status_code >= 400) as error_requests,
          ROUND(AVG(duration_ms)) as avg_duration_ms
        FROM t_p83865419_api_gateway_converte.logs
        WHERE function_name IN ('ekomkassa-receipt', 'ekomkassa-status', 'ekomkassa-auth')
    """)
    
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    total_requests = int(row[0]) if row[0] else 0
    successful_requests = int(row[1]) if row[1] else 0
    error_requests = int(row[2]) if row[2] else 0
    avg_duration_ms = int(row[3]) if row[3] else 0
    
    result = {
        'total_requests': total_requests,
        'successful_requests': successful_requests,
        'error_requests': error_requests,
        'avg_duration_ms': avg_duration_ms
    }
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(result),
        'isBase64Encoded': False
    }
