// SMS provider abstraction.
// In dev, codes are logged to console. In prod, use Aligo (알리고) or NHN Cloud.
// PoC note: Aligo is the most common low-cost SMS provider for Korean services.

interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendOtpSms(phone: string, code: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER ?? 'console';
  const message = `[실버로그] 인증번호는 ${code} 입니다. (3분간 유효)`;

  if (provider === 'console') {
    // Development mode — print to server logs
    console.log(`[SMS:${phone}] ${message}`);
    return { success: true, providerMessageId: 'dev-' + Date.now() };
  }

  if (provider === 'aligo') {
    return sendViaAligo(phone, message);
  }

  return { success: false, error: `Unknown SMS provider: ${provider}` };
}

async function sendViaAligo(phone: string, message: string): Promise<SmsResult> {
  const apiKey = process.env.SMS_API_KEY;
  const userId = process.env.SMS_USER_ID;
  const sender = process.env.SMS_SENDER;

  if (!apiKey || !userId || !sender) {
    return { success: false, error: 'Aligo SMS env vars missing' };
  }

  const body = new URLSearchParams({
    key: apiKey,
    user_id: userId,
    sender,
    receiver: phone,
    msg: message,
    msg_type: 'SMS',
  });

  try {
    const res = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = await res.json();
    if (json.result_code === '1') {
      return { success: true, providerMessageId: json.msg_id };
    }
    return { success: false, error: json.message ?? 'Aligo error' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
