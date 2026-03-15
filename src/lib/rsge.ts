import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

// ---- Types ----
export interface RsgeConfig {
  su: string;
  sp: string;
  demo: boolean;
  company_tin: string;
  company_name: string;
  is_active?: boolean;
}

// Legacy alias for backward compat with RSGEPage
export type { RsgeConfig as RsgeLocalConfig };

export interface WaybillGood {
  id: number;
  name: string;
  unitId: number;
  unitName: string;
  quantity: number;
  price: number;
  total: number;
  barCode?: string;
}

export interface RsgeWaybill {
  id: string;
  number: string;
  type: number;
  typeName: string;
  status: number;
  statusName: string;
  buyerTin: string;
  buyerName: string;
  sellerTin?: string;
  sellerName?: string;
  createDate: string;
  activateDate: string;
  deliveryDate?: string;
  total: number;
  transportType?: number;
  transportTypeName?: string;
  driverTin?: string;
  carNumber?: string;
  startAddress?: string;
  endAddress?: string;
  comment?: string;
  goods?: WaybillGood[];
}

export interface RsgeInvoice {
  id: string;
  number: string;
  buyerTin: string;
  buyerName: string;
  sellerTin?: string;
  sellerName?: string;
  date: string;
  total: number;
  status: string;
  statusTxt?: string;
  items?: { name: string; quantity: number; price: number; total: number; unitName: string }[];
}

export interface FiscalReceiptItem { name: string; qty: number; price: number; total: number; }
export interface FiscalReceipt {
  id: string;
  number: string;
  date: string;
  items: FiscalReceiptItem[];
  total: number;
  paymentType: 'cash' | 'card';
  cashierName: string;
  status: 'completed' | 'voided';
}

export interface FiscalShift {
  id: string | null;
  openedAt: string | null;
  closedAt: string | null;
  cashierName: string;
  totalSales: number;
  totalAmount: number;
  isOpen: boolean;
}

export interface WaybillType { id: number; name: string; }
export interface WaybillUnit { id: number; name: string; }
export interface TransportType { id: number; name: string; }
export interface WaybillStatus { id: number; name: string; }
export interface ServiceUser { id: string; name: string; ip: string; }
export interface CompanyInfo {
  tin: string;
  name: string;
  address: string;
  director: string;
  isVatPayer: boolean;
  registrationDate: string;
}

export interface RsgeAuditLog {
  id: string;
  action: string;
  document_type: string;
  document_id: string | null;
  status: string;
  error_message: string | null;
  demo_mode: boolean;
  created_at: string;
  request_data?: any;
  response_data?: any;
}

// ---- Config helpers (DB-backed) ----

/**
 * Load RS.GE config from DB for the active tenant.
 * Falls back to empty config if none exists.
 */
export const getRsgeConfigFromDb = async (): Promise<RsgeConfig | null> => {
  const result = await rsgeCall('get_config', {});
  if (result?.config) return result.config as RsgeConfig;
  return null;
};

/**
 * Save RS.GE config to DB for the active tenant.
 */
export const saveRsgeConfigToDb = async (config: Partial<RsgeConfig>): Promise<void> => {
  await rsgeCall('save_config', config);
};

// ---- Core caller — sends action + tenant_id, NO credentials in payload ----
export const rsgeCall = async (action: string, data?: Record<string, any>) => {
  const tenantId = useAuthStore.getState().activeTenantId;
  if (!tenantId) throw new Error('tenant_id არ არის. გთხოვ შეხვიდე სისტემაში.');

  const { data: result, error } = await supabase.functions.invoke('RS-GE', {
    body: { action, tenant_id: tenantId, data },
  });

  if (error) throw new Error(error.message);
  if (result?.error) throw new Error(result.error);
  return result;
};

// ---- Waybill API ----
export const getWaybills = (filters?: any) => rsgeCall('get_waybills', filters);
export const getWaybill = (waybillId: string) => rsgeCall('get_waybill', { waybillId });
export const getWaybillGoodsList = (waybillId: string) => rsgeCall('get_waybill_goods_list', { waybillId });
export const getWaybillTypes = () => rsgeCall('get_waybill_types');
export const getWaybillUnits = () => rsgeCall('get_waybill_units');
export const getTransportTypes = () => rsgeCall('get_trans_types');
export const getWaybillStatuses = () => rsgeCall('get_waybill_statuses');
export const saveWaybill = (data: any) => rsgeCall('save_waybill', data);
export const sendWaybill = (waybillId: string) => rsgeCall('send_waybill', { waybillId });
export const closeWaybill = (waybillId: string) => rsgeCall('close_waybill', { waybillId });
export const deleteWaybill = (waybillId: string) => rsgeCall('delete_waybill', { waybillId });
export const refuseWaybill = (waybillId: string) => rsgeCall('ref_waybill', { waybillId });
export const confirmWaybill = (waybillId: string) => rsgeCall('confirm_waybill', { waybillId });
export const getBuyerWaybills = (filters?: any) => rsgeCall('get_buyer_waybills', filters);

// ---- Invoice API ----
export const getInvoices = (filters?: any) => rsgeCall('get_invoices', filters);
export const getInvoice = (invoiceId: string) => rsgeCall('get_invoice', { invoiceId });
export const saveInvoice = (data: any) => rsgeCall('save_invoice', data);
export const deleteInvoice = (invoiceId: string) => rsgeCall('delete_invoice', { invoiceId });

// ---- Utility API ----
export const checkVatPayer = (tin: string) => rsgeCall('is_vat_payer', { tin });
export const getBarCodes = (barCode: string) => rsgeCall('get_bar_codes', { barCode });
export const whatIsMyIp = () => rsgeCall('what_is_my_ip');
export const getServiceUsers = () => rsgeCall('get_service_users');
export const getCompanyInfo = () => rsgeCall('get_company_info');
export const getBuyerTinFromRs = (tin: string) => rsgeCall('get_name_from_tin', { tin });

// ---- Fiscal API ----
export const getFiscalReceipts = () => rsgeCall('get_fiscal_receipts');
export const createFiscalReceipt = (data: any) => rsgeCall('create_fiscal_receipt', data);
export const voidFiscalReceipt = (receiptId: string) => rsgeCall('void_fiscal_receipt', { receiptId });
export const getFiscalShift = () => rsgeCall('get_shift');
export const openFiscalShift = (cashierName: string) => rsgeCall('open_shift', { cashierName });
export const closeFiscalShift = () => rsgeCall('close_shift');

// ---- Audit Log fetch (direct Supabase — no edge function needed) ----
export const getRsgeAuditLogs = async (tenantId: string, limit = 50): Promise<RsgeAuditLog[]> => {
  const { data, error } = await supabase
    .from('rsge_audit_logs')
    .select('id, action, document_type, document_id, status, error_message, demo_mode, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as RsgeAuditLog[];
};
