import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface SendSmsParams {
  mobile: string;
  surname: string;
}

export interface SendSmsResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
  data?: any;
  error?: any;
  recipient?: string;
  message?: string;
}

export const formatMobile = (mobile: any): string | null => {
  if (!mobile) return null;
  let clean = String(mobile).replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  } else if (clean.startsWith('0') && clean.length === 10) {
    clean = '233' + clean.substring(1);
  }
  if (!clean.startsWith('233')) {
    return null;
  }
  return clean;
};

export const formatSurname = (surname: any): string => {
  if (!surname) return 'Valued Customer';
  let clean = String(surname).trim().toLowerCase();
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  return clean.split(' ')[0];
};

export const sendSms = async ({ mobile, surname }: SendSmsParams): Promise<SendSmsResult> => {
  dotenv.config();

  const HUBTEL_API_URL = process.env.HUBTEL_API_URL || 'https://smsc.hubtel.com/v1/messages/send';
  const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID;
  const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET;
  const SENDER_ID = process.env.HUBTEL_SENDER_ID || 'DIRECT';

  if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET) {
    console.warn('Hubtel credentials not configured in .env. Skipping SMS send.');
    return {
      success: false,
      skipped: true,
      reason: 'Missing Hubtel credentials (HUBTEL_CLIENT_ID or HUBTEL_CLIENT_SECRET)',
    };
  }

  const formattedMobile = formatMobile(mobile);
  if (!formattedMobile) {
    console.warn(`Invalid mobile number "${mobile}". Cannot send SMS.`);
    return {
      success: false,
      skipped: true,
      reason: `Invalid mobile number: "${mobile}". Ghanaian number starting with 233 is required.`,
    };
  }

  const smsSurname = `${surname?.toUpperCase() || 'Valued Customer'}`;
  const message = `Dear ${smsSurname}, get upto 1-year low-interest salary loan from Direct Savings and Loans. Dial *396*2# or contact 0302 743 310 for assistance. Thank you.`;

  try {
    const response = await axios.post(
      HUBTEL_API_URL,
      {
        from: SENDER_ID,
        to: formattedMobile,
        content: message,
      },
      {
        auth: {
          username: HUBTEL_CLIENT_ID,
          password: HUBTEL_CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log(`SMS sent successfully to ${smsSurname} at ${formattedMobile}`);
    return {
      success: true,
      status: response.status,
      data: response.data,
      recipient: formattedMobile,
      message,
    };
  } catch (error: any) {
    console.error('Hubtel SMS error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
      recipient: formattedMobile,
    };
  }
};
