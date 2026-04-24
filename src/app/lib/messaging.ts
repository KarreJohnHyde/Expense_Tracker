import { supabase } from './supabase';

/**
 * Messaging Utility for WhatsApp and SMS.
 * Uses Supabase Edge Functions as a gateway to Twilio.
 */

export interface MessagingResponse {
  success: boolean;
  error?: string;
  sid?: string;
}

/**
 * Normalizes a phone number to E.164 format.
 * Expects input like "+14155552671" or "919876543210"
 */
export function formatE164(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (!cleaned) return '';

  // If it starts with 00, treat it as an international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  } else if (!cleaned.startsWith('+')) {
    // Otherwise, assume the user provided the country code but forgot the +
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Dispatches a message via the Supabase Edge Function gateway.
 */
async function dispatchMessage(
  to: string,
  message: string,
  provider: 'whatsapp' | 'sms'
): Promise<MessagingResponse> {
  const formattedTo = formatE164(to);
  if (!formattedTo) {
    return { success: false, error: 'Invalid phone number format.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('integrations-messaging', {
      body: {
        action: 'send_message',
        provider,
        to: formattedTo,
        message
      }
    });

    if (error) throw error;
    return data as MessagingResponse;
  } catch (err: any) {
    console.error(`[MESSAGING] Failed to send ${provider}:`, err);
    return { success: false, error: err.message || 'Gateway unreachable.' };
  }
}

export const messaging = {
  /**
   * Sends an automated WhatsApp message.
   */
  sendWhatsApp: (to: string, message: string) => dispatchMessage(to, message, 'whatsapp'),

  /**
   * Sends an automated SMS message.
   */
  sendSMS: (to: string, message: string) => dispatchMessage(to, message, 'sms'),

  /**
   * Fallback: Opens the WhatsApp "Click to Chat" web link.
   * Useful if automated API is not configured or fails.
   */
  openWhatsAppLink: (to: string, message: string) => {
    const formatted = formatE164(to).replace('+', '');
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  },

  /**
   * Fallback: Opens the native SMS application.
   * Useful on mobile devices if the automated API fails.
   */
  openSMSLink: (to: string, message: string) => {
    const formatted = formatE164(to);
    // Use _self for sms: links to avoid popup blockers on some browsers
    const url = `sms:${formatted}?body=${encodeURIComponent(message)}`;
    window.open(url, '_self');
  }
};
