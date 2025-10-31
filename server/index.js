const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

async function logToDB(functionName, logLevel, message, requestData = null, responseData = null, requestId = null, durationMs = null, statusCode = null) {
  if (!pool) return;
  
  try {
    await pool.query(
      `INSERT INTO logs (function_name, log_level, message, request_data, response_data, request_id, duration_ms, status_code) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        functionName,
        logLevel,
        message,
        requestData ? JSON.stringify(requestData) : null,
        responseData ? JSON.stringify(responseData) : null,
        requestId,
        durationMs,
        statusCode
      ]
    );
  } catch (error) {
    console.error('Failed to write log to DB:', error.message);
  }
}

function convertEkomkassaToFerma(ekomkassaResponse) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const formatDate = (date) => {
    return date.toISOString().split('.')[0];
  };
  
  return {
    Status: 'Success',
    Data: {
      AuthToken: ekomkassaResponse.token,
      ExpirationDateUtc: formatDate(expirationDate)
    }
  };
}

function convertStatusToFerma(ekomkassaStatusResponse) {
  const statusMapping = {
    'wait': 'Pending',
    'ready': 'Ready',
    'error': 'Error'
  };
  
  const status = statusMapping[ekomkassaStatusResponse.status] || 'Pending';
  
  const fermaResponse = {
    Status: 'Success',
    Data: {
      Status: status,
      StatusCode: ekomkassaStatusResponse.code || 0,
      StatusMessage: ekomkassaStatusResponse.text || '',
      Payload: ekomkassaStatusResponse.payload || null
    }
  };
  
  if (ekomkassaStatusResponse.error) {
    fermaResponse.Data.Error = ekomkassaStatusResponse.error;
  }
  
  return fermaResponse;
}

function convertReceiptToFerma(ekomkassaReceiptResponse) {
  return {
    Status: 'Success',
    Data: {
      ReceiptId: ekomkassaReceiptResponse.uuid || ekomkassaReceiptResponse.external_id,
      Status: ekomkassaReceiptResponse.status === 'wait' ? 'Pending' : 'Ready',
      StatusCode: ekomkassaReceiptResponse.code || 0,
      StatusMessage: ekomkassaReceiptResponse.text || ''
    }
  };
}

app.post('/api/Authorization/CreateAuthToken', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  
  const { login, password } = req.body;
  
  console.log(`[AUTH] Incoming request: login=${login}, password=${'***' if password else None}`);
  await logToDB('auth', 'INFO', 'Incoming auth request', 
    { login, has_password: !!password }, null, requestId);
  
  if (!login || !password) {
    return res.status(400).json({ error: 'login and password required' });
  }
  
  try {
    const requestPayload = { login, pass: password };
    console.log(`[AUTH] Request to eKomKassa:`, { login, pass: '***' });
    
    const response = await axios.post(
      'https://app.ecomkassa.ru/fiscalorder/v5/getToken',
      requestPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    const durationMs = Date.now() - startTime;
    console.log(`[AUTH] Response from eKomKassa: status=${response.status}`);
    
    await logToDB('auth', 'INFO', 'eKomKassa response received',
      { login },
      response.data,
      requestId,
      durationMs,
      response.status);
    
    const fermaResponse = convertEkomkassaToFerma(response.data);
    res.status(200).json(fermaResponse);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[AUTH] eKomKassa API error:`, error.message);
    
    await logToDB('auth', 'ERROR', `eKomKassa API error: ${error.message}`,
      { login }, null, requestId, durationMs, 500);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: `eKomKassa API error: ${error.message}` });
    }
  }
});

app.get('/api/kkt/cloud/status', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  
  const { AuthToken, group_code = '700', uuid } = req.query;
  
  console.log(`[STATUS] Incoming request: uuid=${uuid}, group_code=${group_code}`);
  await logToDB('status', 'INFO', 'Incoming status check request',
    { uuid, group_code, has_token: !!AuthToken }, null, requestId);
  
  if (!AuthToken) {
    return res.status(400).json({ error: 'AuthToken required' });
  }
  
  if (!uuid) {
    return res.status(400).json({ error: 'uuid required' });
  }
  
  const ekomkassaUrl = `https://app.ecomkassa.ru/fiscalorder/v5/${group_code}/report/${uuid}`;
  console.log(`[STATUS] Request to eKomKassa: ${ekomkassaUrl}`);
  
  try {
    const response = await axios.get(ekomkassaUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Token': AuthToken
      },
      timeout: 10000
    });
    
    const durationMs = Date.now() - startTime;
    console.log(`[STATUS] Response from eKomKassa: status=${response.status}`);
    
    await logToDB('status', 'INFO', 'eKomKassa status response received',
      { uuid, group_code },
      response.data,
      requestId,
      durationMs,
      response.status);
    
    const fermaResponse = convertStatusToFerma(response.data);
    res.status(200).json(fermaResponse);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[STATUS] eKomKassa API error:`, error.message);
    
    await logToDB('status', 'ERROR', `eKomKassa API error: ${error.message}`,
      { uuid, group_code }, null, requestId, durationMs, 500);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: `eKomKassa API error: ${error.message}` });
    }
  }
});

app.post('/api/kkt/cloud/receipt', async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  
  console.log(`[RECEIPT] Incoming request:`, JSON.stringify(req.body));
  await logToDB('receipt', 'INFO', 'Incoming receipt request', req.body, null, requestId);
  
  const fermaRequest = req.body.Request;
  
  if (fermaRequest) {
    return convertFermaToEkomkassa(req, res, fermaRequest, req.body.token, req.body.group_code || '700', startTime, requestId);
  } else {
    return convertSimpleFormat(req, res, req.body, startTime, requestId);
  }
});

async function convertFermaToEkomkassa(req, res, fermaRequest, token, groupCode, startTime, requestId) {
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  const receipt = fermaRequest.CustomerReceipt || {};
  const items = receipt.Items || [];
  
  if (items.length === 0) {
    return res.status(400).json({ error: 'Items required' });
  }
  
  const fermaVatMapping = {
    'VatNo': 'none',
    'Vat0': 'vat0',
    'Vat10': 'vat10',
    'Vat20': 'vat20',
    'CalculatedVat20120': 'vat20',
    'CalculatedVat10110': 'vat10'
  };
  
  const paymentMethodMapping = {
    0: 'full_prepayment',
    1: 'prepayment',
    2: 'advance',
    3: 'full_payment',
    4: 'partial_payment',
    5: 'credit',
    6: 'credit_payment'
  };
  
  const measureMapping = {
    'PIECE': 0, 'GRAM': 10, 'KILOGRAM': 11, 'TON': 12,
    'CENTIMETER': 20, 'DECIMETER': 21, 'METER': 22,
    'SQUARE_CENTIMETER': 30, 'SQUARE_DECIMETER': 31, 'SQUARE_METER': 32,
    'MILLILITER': 40, 'LITER': 41, 'CUBIC_METER': 42,
    'KILOWATT_HOUR': 50, 'GIGACALORIE': 51,
    'DAY': 70, 'HOUR': 71, 'MINUTE': 72, 'SECOND': 73,
    'KILOBYTE': 80, 'MEGABYTE': 81, 'GIGABYTE': 82, 'TERABYTE': 83,
    'OTHER': 255
  };
  
  const atolItems = items.map(item => ({
    name: item.Label || 'Товар',
    price: parseFloat(item.Price || 0),
    quantity: parseFloat(item.Quantity || 1),
    sum: parseFloat(item.Amount || 0),
    payment_method: paymentMethodMapping[item.PaymentMethod] || 'full_payment',
    payment_object: 4,
    measure: measureMapping[item.Measure] || 0,
    vat: {
      type: fermaVatMapping[item.Vat] || 'none'
    }
  }));
  
  const cashlessPayments = receipt.CashlessPayments || [];
  let atolPayments = cashlessPayments.map(payment => ({
    type: 1,
    sum: parseFloat(payment.PaymentSum || 0)
  }));
  
  if (atolPayments.length === 0) {
    const total = atolItems.reduce((sum, item) => sum + item.sum, 0);
    atolPayments.push({ type: 1, sum: total });
  }
  
  const taxationSystemMapping = {
    'Common': 'osn',
    'Simplified': 'usn_income',
    'SimplifiedWithExpenses': 'usn_income_outcome',
    'Unified': 'envd',
    'Patent': 'patent',
    'UnifiedAgricultural': 'esn'
  };
  
  const sno = taxationSystemMapping[receipt.TaxationSystem] || 'osn';
  
  const operationMapping = {
    'Income': 'sell',
    'IncomeReturn': 'sell_refund',
    'Outcome': 'buy',
    'OutcomeReturn': 'buy_refund',
    'IncomeCorrection': 'sell_correction',
    'SellCorrection': 'sell_correction',
    'OutcomeCorrection': 'buy_correction',
    'BuyCorrection': 'buy_correction',
    'IncomeReturnCorrection': 'sell_refund_correction',
    'SellRefundCorrection': 'sell_refund_correction',
    'OutcomeReturnCorrection': 'buy_refund_correction',
    'BuyRefundCorrection': 'buy_refund_correction'
  };
  
  const operation = operationMapping[fermaRequest.Type] || 'sell';
  const isCorrection = ['sell_correction', 'buy_correction', 'sell_refund_correction', 'buy_refund_correction'].includes(operation);
  
  const clientInfo = {};
  if (receipt.Email) clientInfo.email = receipt.Email;
  if (receipt.Phone) clientInfo.phone = receipt.Phone;
  
  const timestamp = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const companyData = {
    email: clientInfo.email || 'shop@example.com',
    sno: sno,
    inn: fermaRequest.Inn || '0000000000',
    payment_address: fermaRequest.CallbackUrl || 'https://example.com'
  };
  
  let ekomkassaPayload;
  
  if (isCorrection) {
    ekomkassaPayload = {
      external_id: fermaRequest.RequestId || `req-${Date.now()}`,
      correction: {
        company: companyData,
        correction_info: {
          type: 'self',
          base_date: timestamp.split(' ')[0],
          base_number: fermaRequest.RequestId || '1',
          base_name: 'Коррекция'
        },
        payments: atolPayments,
        vats: atolItems.map(item => ({
          type: item.vat.type,
          sum: item.sum
        }))
      },
      timestamp: timestamp
    };
  } else {
    ekomkassaPayload = {
      external_id: fermaRequest.RequestId || `req-${Date.now()}`,
      receipt: {
        client: clientInfo,
        company: companyData,
        items: atolItems,
        payments: atolPayments,
        total: atolPayments.reduce((sum, p) => sum + p.sum, 0)
      },
      timestamp: timestamp
    };
  }
  
  const ekomkassaUrl = `https://app.ecomkassa.ru/fiscalorder/v5/${groupCode}/${operation}`;
  console.log(`[RECEIPT] Request to eKomKassa: ${ekomkassaUrl}`);
  
  try {
    const response = await axios.post(ekomkassaUrl, ekomkassaPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Token': token
      },
      timeout: 30000
    });
    
    const durationMs = Date.now() - startTime;
    console.log(`[RECEIPT-FERMA] Response from eKomKassa: status=${response.status}`);
    
    await logToDB('receipt', 'INFO', 'eKomKassa receipt response received (Ferma format)',
      ekomkassaPayload,
      response.data,
      requestId,
      durationMs,
      response.status);
    
    const fermaResponse = convertReceiptToFerma(response.data);
    res.status(200).json(fermaResponse);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[RECEIPT-FERMA] eKomKassa API error:`, error.message);
    
    await logToDB('receipt', 'ERROR', `eKomKassa API error: ${error.message}`,
      ekomkassaPayload, null, requestId, durationMs, 500);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: `eKomKassa API error: ${error.message}` });
    }
  }
}

async function convertSimpleFormat(req, res, bodyData, startTime, requestId) {
  const { token, group_code = '700', operation = 'sell', external_id, receipt } = bodyData;
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  if (!receipt || !receipt.items) {
    return res.status(400).json({ error: 'receipt.items required' });
  }
  
  const timestamp = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const ekomkassaPayload = {
    external_id: external_id || `req-${Date.now()}`,
    receipt: receipt,
    timestamp: timestamp
  };
  
  const ekomkassaUrl = `https://app.ecomkassa.ru/fiscalorder/v5/${group_code}/${operation}`;
  console.log(`[RECEIPT] Request to eKomKassa: ${ekomkassaUrl}`);
  
  try {
    const response = await axios.post(ekomkassaUrl, ekomkassaPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Token': token
      },
      timeout: 30000
    });
    
    const durationMs = Date.now() - startTime;
    console.log(`[RECEIPT-SIMPLE] Response from eKomKassa: status=${response.status}`);
    
    await logToDB('receipt', 'INFO', 'eKomKassa receipt response received (Simple format)',
      ekomkassaPayload,
      response.data,
      requestId,
      durationMs,
      response.status);
    
    const fermaResponse = convertReceiptToFerma(response.data);
    res.status(200).json(fermaResponse);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[RECEIPT-SIMPLE] eKomKassa API error:`, error.message);
    
    await logToDB('receipt', 'ERROR', `eKomKassa API error: ${error.message}`,
      ekomkassaPayload, null, requestId, durationMs, 500);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: `eKomKassa API error: ${error.message}` });
    }
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 eKomKassa Gateway Server running on port ${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   POST /api/Authorization/CreateAuthToken`);
  console.log(`   GET  /api/kkt/cloud/status`);
  console.log(`   POST /api/kkt/cloud/receipt`);
  console.log(`   GET  /health`);
});