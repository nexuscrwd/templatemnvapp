import { PixKeyType } from '../types';

export interface PixPayloadOptions {
  pixKey: string;
  keyType?: PixKeyType;
  merchantName: string;
  merchantCity?: string;
  amount?: number;
  txid?: string;
  description?: string;
}

export interface WhatsAppPixChargeParams {
  clientPhone?: string;
  clientName?: string;
  salonName: string;
  serviceTitle?: string;
  amount: number;
  pixKey: string;
  pixPayload: string;
}

const stripAccentsAndSpecial = (input: string, maxLength: number): string => {
  const cleaned = (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return (cleaned || 'VAGOU SALAO').slice(0, maxLength);
};

export const normalizePixKeyForBacen = (rawKey: string, keyType?: PixKeyType): string => {
  const trimmed = (rawKey || '').trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');

  if (keyType === 'cpf' || (!keyType && digits.length === 11 && !trimmed.includes('@'))) {
    return digits;
  }
  if (keyType === 'cnpj' || (!keyType && digits.length === 14 && !trimmed.includes('@'))) {
    return digits;
  }
  if (keyType === 'phone') {
    if (trimmed.startsWith('+')) return `+${digits}`;
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
    return `+${digits}`;
  }
  if (keyType === 'email' || trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  return trimmed;
};

const formatEmvField = (id: string, value: string): string => {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
};

const computeCrc16Ccitt = (payload: string): string => {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/**
 * Gera o payload oficial EMV® QRCPS-MPM (BR Code BACEN - PIX Copia e Cola)
 */
export const generatePixPayload = ({
  pixKey,
  keyType,
  merchantName,
  merchantCity = 'BRASIL',
  amount,
  txid = '***',
  description,
}: PixPayloadOptions): string => {
  const normalizedKey = normalizePixKeyForBacen(pixKey, keyType);
  if (!normalizedKey) return '';

  const guiField = formatEmvField('00', 'br.gov.bcb.pix');
  const keyField = formatEmvField('01', normalizedKey);
  const descClean = description ? stripAccentsAndSpecial(description, 25) : '';
  const descField = descClean ? formatEmvField('02', descClean) : '';

  const merchantAccountInfo = formatEmvField('26', `${guiField}${keyField}${descField}`);
  const payloadFormatIndicator = formatEmvField('00', '01');
  const merchantCategoryCode = formatEmvField('52', '0000');
  const transactionCurrency = formatEmvField('53', '986');

  const validAmount = typeof amount === 'number' && !isNaN(amount) && amount > 0 ? amount.toFixed(2) : '';
  const transactionAmount = validAmount ? formatEmvField('54', validAmount) : '';

  const countryCode = formatEmvField('58', 'BR');
  const nameField = formatEmvField('59', stripAccentsAndSpecial(merchantName || 'ESTABELECIMENTO', 25));
  const cityField = formatEmvField('60', stripAccentsAndSpecial(merchantCity || 'BRASIL', 15));

  const cleanTxid = txid === '***' ? '***' : (txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***');
  const additionalDataField = formatEmvField('62', formatEmvField('05', cleanTxid));

  const basePayload = [
    payloadFormatIndicator,
    merchantAccountInfo,
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount,
    countryCode,
    nameField,
    cityField,
    additionalDataField,
    '6304',
  ].join('');

  const crc = computeCrc16Ccitt(basePayload);
  return `${basePayload}${crc}`;
};

/**
 * Retorna a URL da imagem do QR Code PIX padrão BACEN
 */
export const getPixQrCodeUrl = (
  payloadOrOptions: string | PixPayloadOptions,
  size = 280
): string => {
  const payload =
    typeof payloadOrOptions === 'string'
      ? payloadOrOptions
      : generatePixPayload(payloadOrOptions);

  if (!payload) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(payload)}`;
};

/**
 * Monta o link direto de cobrança pós-serviço via WhatsApp com PIX Copia e Cola
 */
export const buildWhatsAppPixChargeUrl = ({
  clientPhone,
  clientName,
  salonName,
  serviceTitle,
  amount,
  pixKey,
  pixPayload,
}: WhatsAppPixChargeParams): string => {
  const cleanPhone = (clientPhone || '').replace(/\D/g, '');
  const formattedPhone =
    cleanPhone.length >= 10
      ? cleanPhone.startsWith('55') && cleanPhone.length >= 12
        ? cleanPhone
        : `55${cleanPhone}`
      : '';

  const firstName = (clientName || 'Cliente').trim().split(' ')[0] || 'Cliente';
  const formattedValue = Number(amount || 0).toFixed(2).replace('.', ',');
  const serviceLine = serviceTitle ? `referente ao serviço *${serviceTitle}*` : 'referente ao seu atendimento';

  const message = [
    `Olá *${firstName}*! Tudo bem?`,
    `Obrigado pela preferência no *${salonName}*! ✂️`,
    ``,
    `Segue o PIX ${serviceLine}:`,
    `💰 *Valor:* R$ ${formattedValue}`,
    `🔑 *Chave PIX:* ${pixKey}`,
    ``,
    `📋 *PIX Copia e Cola (basta copiar o código abaixo):*`,
    pixPayload,
  ].join('\n');

  const encodedText = encodeURIComponent(message);
  return formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
};
