// SMS provider abstraction.
// Providers: ncp (NCP SENS — default), console (dev fallback).
//
// NCP SENS env vars:
//   NCP_ACCESS_KEY, NCP_SECRET_KEY, NCP_SENS_SERVICE_ID, NCP_SENS_FROM

import crypto from 'crypto';

interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendOtpSms(phone: string, code: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER ?? 'ncp';
  const message = `[실버로그] 인증번호는 ${code} 입니다. (3분간 유효)`;

  if (provider === 'console') {
    console.log(`[SMS:${phone}] ${message}`);
    return { success: true, providerMessageId: 'dev-' + Date.now() };
  }

  if (provider === 'ncp') {
    return sendViaNcp(phone, message);
  }

  return { success: false, error: `Unknown SMS provider: ${provider}` };
}

async function sendViaNcp(phone: string, message: string): Promise<SmsResult> {
  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const from = process.env.NCP_SENS_FROM;

  if (!accessKey || !secretKey || !serviceId || !from) {
    return { success: false, error: 'NCP SENS env vars missing' };
  }

  const timestamp = String(Date.now());
  const method = 'POST';
  const url = `/sms/v2/services/${serviceId}/messages`;

  const signature = makeNcpSignature(method, url, timestamp, accessKey, secretKey);

  const { countryCode, localNumber } = parsePhone(phone);

  const body = JSON.stringify({
    type: 'SMS',
    contentType: 'COMM',
    from,
    content: message,
    messages: [{ to: localNumber, countryCode }],
  });

  try {
    const res = await fetch(`https://sens.apigw.ntruss.com${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
      },
      body,
    });
    const json = await res.json();
    if (res.ok && json.statusCode === '202') {
      return { success: true, providerMessageId: json.requestId };
    }
    return { success: false, error: json.statusName ?? `NCP error ${res.status}` };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

function parsePhone(phone: string): { countryCode: string; localNumber: string } {
  if (phone.startsWith('+')) {
    if (/^\+1\d{10}$/.test(phone)) return { countryCode: '1', localNumber: phone.slice(2) };
    if (/^\+82\d{9,10}$/.test(phone)) return { countryCode: '82', localNumber: phone.slice(3) };
    // Generic E.164: strip leading +, let NCP route it
    return { countryCode: '', localNumber: phone.slice(1) };
  }
  return { countryCode: '82', localNumber: phone };
}

function makeNcpSignature(
  method: string,
  url: string,
  timestamp: string,
  accessKey: string,
  secretKey: string,
): string {
  const message = `${method} ${url}\n${timestamp}\n${accessKey}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}
