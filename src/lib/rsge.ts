import { supabase } from '@/integrations/supabase/client';

export interface RsgeConfig { su: string; sp: string; demo: boolean; companyTin: string; companyName: string; }
export interface WaybillGood { id: number; name: string; unitId: number; unitName: string; quantity: number; price: number; total: number; barCode?: string; }
export interface RsgeWaybill { id: string; number: string; type: number; typeName: string; status: number; statusName: string; buyerTin: string; buyerName: string; sellerTin?: string; sellerName?: string; createDate: string; activateDate: string; deliveryDate?: string; total: number; transportType?: number; transportTypeName?: string; driverTin?: string; carNumber?: string; startAddress?: string; endAddress?: string; comment?: string; goods?: WaybillGood[]; }
export interface RsgeInvoice { id: string; number: string; buyerTin: string; buyerName: string; sellerTin?: string; sellerName?: string; date: string; total: number; status: string; items?: { name: string; quantity: number; price: number; total: number; unitName: string }[]; }
export interface FiscalReceiptItem { name: string; qty: number; price: number; total: number; }
export interface FiscalReceipt { id: string; number: string; date: string; items: FiscalReceiptItem[]; total: number; paymentType: 'cash' | 'card'; cashierName: string; status: 'completed' | 'voided'; }
export interface FiscalShift { id: string; openedAt: string; closedAt: string | null; cashierName: string; totalSales: number; totalAmount: number; isOpen: boolean; }
export interface WaybillType { id: number; name: string; }
export interface WaybillUnit { id: number; name: string; }
export interface TransportType { id: number; name: string; }
export interface WaybillStatus { id: number; name: string; }
export interface ServiceUser { id: string; name: string; ip: string; }
export interface CompanyInfo { tin: string; name: string; address: string; director: string; isVatPayer: boolean; registrationDate: string; }

const STORAGE_KEY = 'rsge_config';

export const getRsgeConfig = (): RsgeConfig => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return { su: '', sp: '', demo: true, companyTin: '', companyName: '' };
};

export const saveRsgeConfig = (config: RsgeConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const rsgeCall = async (action: string, data?: Record<string, any>) => {
  const config = getRsgeConfig();
  const { data: result, error } = await supabase.functions.invoke('RS-GE', {
    body: { action, demo: config.demo, su: config.su, sp: config.sp, data },
  });
  if (error) throw new Error(error.message);
  if (result?.error) throw new Error(result.error);
  return result;
};

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
export const getInvoices = () => rsgeCall('get_invoices');
export const getInvoice = (invoiceId: string) => rsgeCall('get_invoice', { invoiceId });
export const saveInvoice = (data: any) => rsgeCall('save_invoice', data);
export const deleteInvoice = (invoiceId: string) => rsgeCall('delete_invoice', { invoiceId });
export const checkVatPayer = (tin: string) => rsgeCall('is_vat_payer', { tin });
export const getBarCodes = (barCode: string) => rsgeCall('get_bar_codes', { barCode });
export const whatIsMyIp = () => rsgeCall('what_is_my_ip');
export const getServiceUsers = () => rsgeCall('get_service_users');
export const getCompanyInfo = () => rsgeCall('get_company_info');
export const getBuyerTinFromRs = (tin: string) => rsgeCall('get_buyer_tin_from_rs', { tin });
export const getFiscalReceipts = () => rsgeCall('get_fiscal_receipts');
export const createFiscalReceipt = (data: any) => rsgeCall('create_fiscal_receipt', data);
export const voidFiscalReceipt = (receiptId: string) => rsgeCall('void_fiscal_receipt', { receiptId });
export const getFiscalShift = () => rsgeCall('get_shift');
export const openFiscalShift = (cashierName: string) => rsgeCall('open_shift', { cashierName });
export const closeFiscalShift = () => rsgeCall('close_shift');
