/// <reference lib="deno.ns" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// RS.GE Proxy Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// RS.GE ფისკალური ჩეკის API
const RS_GE_FISCAL_URL = 'https://www.revenue.mof.ge/tax/api/cashregister';
const RS_GE_URL = 'https://services.rs.ge/WayBillService/WayBillService.asmx';
const RS_GE_DEMO_URL = 'https://services-test.rs.ge/WayBillService/WayBillService.asmx';
const NAMESPACE = 'http://tempuri.org/';

function buildSoapEnvelope(method: string, params: Record<string, any> = {}): string {
  const paramXml = Object.entries(params)
    .map(([key, value]) => {
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) {
        return `<${key}>${value.map(item => {
          if (typeof item === 'object') {
            return Object.entries(item)
              .map(([k, v]) => `<${k}>${escapeXml(String(v ?? ''))}</${k}>`)
              .join('');
          }
          return escapeXml(String(item));
        }).join('')}</${key}>`;
      }
      return `<${key}>${escapeXml(String(value))}</${key}>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="${NAMESPACE}">
      ${paramXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseXmlValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function parseXmlArray(xml: string, itemTag: string): string[] {
  const regex = new RegExp(`<${itemTag}[^>]*>([\\s\\S]*?)<\\/${itemTag}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function parseWaybillFromXml(xml: string): Record<string, any> {
  return {
    id: parseXmlValue(xml, 'ID') || parseXmlValue(xml, 'WAYBILL_NUMBER'),
    number: parseXmlValue(xml, 'WAYBILL_NUMBER') || '',
    type: parseInt(parseXmlValue(xml, 'TYPE') || '0'),
    typeName: parseXmlValue(xml, 'TYPE_TXT') || '',
    status: parseInt(parseXmlValue(xml, 'STATUS') || '0'),
    statusName: parseXmlValue(xml, 'STATUS_TXT') || '',
    buyerTin: parseXmlValue(xml, 'BUYER_TIN') || '',
    buyerName: parseXmlValue(xml, 'BUYER_NAME') || '',
    sellerTin: parseXmlValue(xml, 'SELLER_TIN') || '',
    sellerName: parseXmlValue(xml, 'SELLER_NAME') || '',
    createDate: parseXmlValue(xml, 'CREATE_DATE') || '',
    activateDate: parseXmlValue(xml, 'ACTIVATE_DATE') || '',
    deliveryDate: parseXmlValue(xml, 'DELIVERY_DATE') || '',
    total: parseFloat(parseXmlValue(xml, 'FULL_AMOUNT') || '0'),
    transportType: parseInt(parseXmlValue(xml, 'TRANSPORT_TYPE_ID') || '0'),
    transportTypeName: parseXmlValue(xml, 'TRANSPORT_TYPE_TXT') || '',
    driverTin: parseXmlValue(xml, 'DRIVER_TIN') || '',
    carNumber: parseXmlValue(xml, 'CAR_NUMBER') || '',
    startAddress: parseXmlValue(xml, 'START_ADDRESS') || '',
    endAddress: parseXmlValue(xml, 'END_ADDRESS') || '',
    comment: parseXmlValue(xml, 'COMMENT') || '',
  };
}

function parseGoodsFromXml(xml: string): Record<string, any>[] {
  const goodsItems = parseXmlArray(xml, 'GOODS');
  return goodsItems.map(item => ({
    id: parseInt(parseXmlValue(item, 'ID') || '0'),
    name: parseXmlValue(item, 'W_NAME') || '',
    unitId: parseInt(parseXmlValue(item, 'UNIT_ID') || '0'),
    unitName: parseXmlValue(item, 'UNIT_TXT') || '',
    quantity: parseFloat(parseXmlValue(item, 'QUANTITY') || '0'),
    price: parseFloat(parseXmlValue(item, 'PRICE') || '0'),
    total: parseFloat(parseXmlValue(item, 'AMOUNT') || '0'),
    barCode: parseXmlValue(item, 'BAR_CODE') || '',
  }));
}

interface ActionMap {
  [key: string]: {
    method: string;
    buildParams: (data: any, su: string, sp: string) => Record<string, any>;
    parseResponse: (xml: string) => any;
  };
}

const ACTIONS: ActionMap = {
  get_waybills: {
    method: 'get_waybills',
    buildParams: (data, su, sp) => ({
      su, sp,
      waybill_type: data?.waybill_type || '-1',
      create_date_s: data?.create_date_s || '',
      create_date_e: data?.create_date_e || '',
      buyer_tin: data?.buyer_tin || '',
      status: data?.status || '-1',
      car_number: data?.car_number || '',
      waybill_number: data?.waybill_number || '',
    }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'WAYBILL');
      return { waybills: items.map(parseWaybillFromXml) };
    },
  },
  get_waybill: {
    method: 'get_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => ({ waybill: parseWaybillFromXml(xml) }),
  },
  get_waybill_goods_list: {
    method: 'get_waybill_goods_list',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => ({ goods: parseGoodsFromXml(xml) }),
  },
  get_waybill_types: {
    method: 'get_waybill_types',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'WAYBILL_TYPE');
      return {
        types: items.map(item => ({
          id: parseInt(parseXmlValue(item, 'ID') || '0'),
          name: parseXmlValue(item, 'NAME') || '',
        })),
      };
    },
  },
  get_waybill_units: {
    method: 'get_waybill_units',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'UNIT');
      return {
        units: items.map(item => ({
          id: parseInt(parseXmlValue(item, 'ID') || '0'),
          name: parseXmlValue(item, 'NAME') || '',
        })),
      };
    },
  },
  get_trans_types: {
    method: 'get_trans_types',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'TRANSPORT_TYPE');
      return {
        types: items.map(item => ({
          id: parseInt(parseXmlValue(item, 'ID') || '0'),
          name: parseXmlValue(item, 'NAME') || '',
        })),
      };
    },
  },
  get_waybill_statuses: {
    method: 'get_waybill_statuses',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'STATUS');
      return {
        statuses: items.map(item => ({
          id: parseInt(parseXmlValue(item, 'ID') || '0'),
          name: parseXmlValue(item, 'NAME') || '',
        })),
      };
    },
  },
  save_waybill: {
    method: 'save_waybill',
    buildParams: (data, su, sp) => ({
      su, sp,
      waybill_type: data.waybill_type,
      buyer_tin: data.buyer_tin,
      start_address: data.start_address || '',
      end_address: data.end_address || '',
      driver_tin: data.driver_tin || '',
      transport_type_id: data.transport_type_id || '0',
      car_number: data.car_number || '',
      comment: data.comment || '',
      goods_list: data.goods_list || [],
    }),
    parseResponse: (xml) => {
      const id = parseXmlValue(xml, 'WAYBILL_NUMBER') || parseXmlValue(xml, 'ID');
      return { waybillId: id, success: true };
    },
  },
  send_waybill: {
    method: 'send_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => ({ success: !xml.includes('ERROR'), message: parseXmlValue(xml, 'TEXT') || 'OK' }),
  },
  close_waybill: {
    method: 'close_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => ({ success: !xml.includes('ERROR'), message: parseXmlValue(xml, 'TEXT') || 'OK' }),
  },
  delete_waybill: {
    method: 'delete_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => ({ success: !xml.includes('ERROR') }),
  },
  ref_waybill: {
    method: 'ref_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => ({ success: !xml.includes('ERROR') }),
  },
  confirm_waybill: {
    method: 'confirm_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => ({ success: !xml.includes('ERROR') }),
  },
  get_buyer_waybills: {
    method: 'get_buyer_waybills',
    buildParams: (data, su, sp) => ({
      su, sp,
      buyer_tin: data?.buyer_tin || '',
      create_date_s: data?.create_date_s || '',
      create_date_e: data?.create_date_e || '',
      status: data?.status || '-1',
    }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'WAYBILL');
      return { waybills: items.map(parseWaybillFromXml) };
    },
  },
  is_vat_payer: {
    method: 'is_vat_payer',
    buildParams: (data, su, sp) => ({ su, sp, tin: data.tin }),
    parseResponse: (xml) => {
      const isVat = parseXmlValue(xml, 'IS_VAT_PAYER');
      return { isVatPayer: isVat === 'true' || isVat === '1', name: parseXmlValue(xml, 'NAME') || '' };
    },
  },
  get_bar_codes: {
    method: 'get_bar_codes',
    buildParams: (data, su, sp) => ({ su, sp, bar_code: data.barCode }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'RESULT');
      return {
        results: items.map(item => ({
          name: parseXmlValue(item, 'NAME') || '',
          barCode: parseXmlValue(item, 'BAR_CODE') || '',
          unitId: parseInt(parseXmlValue(item, 'UNIT_ID') || '0'),
          unitName: parseXmlValue(item, 'UNIT_TXT') || '',
        })),
      };
    },
  },
  what_is_my_ip: {
    method: 'what_is_my_ip',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => ({ ip: parseXmlValue(xml, 'IP') || '' }),
  },
  get_service_users: {
    method: 'get_service_users',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'SERVICE_USER');
      return {
        users: items.map(item => ({
          id: parseXmlValue(item, 'ID') || '',
          name: parseXmlValue(item, 'USER_NAME') || '',
          ip: parseXmlValue(item, 'IP') || '',
        })),
      };
    },
  },
  get_company_info: {
    method: 'get_company_info',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => ({
      tin: parseXmlValue(xml, 'TIN') || '',
      name: parseXmlValue(xml, 'NAME') || '',
      address: parseXmlValue(xml, 'ADDRESS') || '',
      director: parseXmlValue(xml, 'DIRECTOR') || '',
      isVatPayer: parseXmlValue(xml, 'IS_VAT_PAYER') === 'true',
      registrationDate: parseXmlValue(xml, 'REG_DATE') || '',
    }),
  },
  get_name_from_tin: {
    method: 'get_name_from_tin',
    buildParams: (data, su, sp) => ({ su, sp, tin: data.tin }),
    parseResponse: (xml) => ({
      name: parseXmlValue(xml, 'NAME') || '',
      tin: parseXmlValue(xml, 'TIN') || '',
    }),
  },
  get_invoices: {
    method: 'get_invoices',
    buildParams: (data, su, sp) => ({ su, sp, ...data }),
    parseResponse: (xml) => {
      const items = parseXmlArray(xml, 'INVOICE');
      return {
        invoices: items.map(item => ({
          id: parseXmlValue(item, 'ID') || '',
          number: parseXmlValue(item, 'NUMBER') || '',
          buyerTin: parseXmlValue(item, 'BUYER_TIN') || '',
          buyerName: parseXmlValue(item, 'BUYER_NAME') || '',
          date: parseXmlValue(item, 'CREATE_DATE') || '',
          total: parseFloat(parseXmlValue(item, 'AMOUNT') || '0'),
          status: parseXmlValue(item, 'STATUS') || '',
        }))
      };
    },
  },
  save_invoice: {
    method: 'save_invoice',
    buildParams: (data, su, sp) => ({ su, sp, ...data }),
    parseResponse: (xml) => ({ invoiceId: parseXmlValue(xml, 'ID') || '', success: true }),
  },
  delete_invoice: {
    method: 'delete_invoice',
    buildParams: (data, su, sp) => ({ su, sp, invoice_id: data.invoiceId }),
    parseResponse: (xml) => ({ success: !xml.includes('ERROR') }),
  },
};

const FISCAL_ACTIONS = new Set([
  'create_fiscal_receipt', 'void_fiscal_receipt',
  'open_shift', 'close_shift', 'get_shift', 'get_fiscal_receipts',
]);

function generateDemoFiscalResponse(action: string, data: any): any {
  const now = new Date().toISOString();
  switch (action) {
    case 'create_fiscal_receipt':
      return {
        success: true,
        receipt: {
          id: crypto.randomUUID(),
          number: `DEMO-${Date.now()}`,
          date: now,
          items: data?.items || [],
          total: data?.total || 0,
          paymentType: data?.paymentType || 'cash',
          cashierName: data?.cashierName || '',
          status: 'completed',
        },
      };
    case 'void_fiscal_receipt':
      return { success: true, message: 'ჩეკი გაუქმებულია (დემო)' };
    case 'open_shift':
      return {
        success: true,
        shift: {
          id: crypto.randomUUID(),
          openedAt: now,
          closedAt: null,
          cashierName: data?.cashierName || '',
          totalSales: 0,
          totalAmount: 0,
          isOpen: true,
        },
      };
    case 'close_shift':
      return { success: true, shift: { closedAt: now, isOpen: false } };
    case 'get_shift':
      return {
        shift: {
          id: crypto.randomUUID(),
          openedAt: now,
          closedAt: null,
          cashierName: '',
          totalSales: 0,
          totalAmount: 0,
          isOpen: false,
        },
      };
    case 'get_fiscal_receipts':
      return { receipts: [] };
    default:
      return { error: 'უცნობი ფისკალური მოქმედება' };
  }
}

async function auditLog(supabase: any, tenantId: string, action: string, docType: string, docId: string | null, status: string, error: string | null, demo: boolean, reqData: any, resData: any) {
  try {
    await supabase.from('rsge_audit_logs').insert({
      tenant_id: tenantId,
      action,
      document_type: docType,
      document_id: docId,
      status,
      error_message: error,
      demo_mode: demo,
      request_data: reqData,
      response_data: resData
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    const payload = await req.json();
    const { action, tenant_id, data } = payload;
    let { demo, su, sp } = payload;

    if (!action) return new Response(JSON.stringify({ error: 'No action' }), { status: 400, headers: corsHeaders });

    // Handle config saving
    if (action === 'save_config') {
      const { data: result, error: saveErr } = await supabase
        .from('rsge_configs')
        .upsert({
          tenant_id,
          su: data.su,
          sp: data.sp || undefined, // Don't overwrite if not provided
          company_tin: data.company_tin,
          company_name: data.company_name,
          demo: data.demo,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });

      if (saveErr) throw saveErr;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Fetch config from DB if not provided
    if (!su || !sp || demo === undefined) {
      if (!tenant_id) return new Response(JSON.stringify({ error: 'Missing tenant_id or credentials' }), { status: 400, headers: corsHeaders });
      
      const { data: config, error: cfgErr } = await supabase
        .from('rsge_configs')
        .select('su, sp, demo')
        .eq('tenant_id', tenant_id)
        .single();
      
      if (cfgErr || !config) {
        return new Response(JSON.stringify({ error: 'RS.GE configuration not found for this tenant.' }), { status: 404, headers: corsHeaders });
      }
      
      su = su || config.su;
      sp = sp || config.sp;
      demo = demo !== undefined ? demo : config.demo;
    }

    if (!su || !sp) {
      return new Response(JSON.stringify({ error: 'Credentials (su/sp) missing' }), { status: 400, headers: corsHeaders });
    }

    // Fiscal Demo Mode
    if (FISCAL_ACTIONS.has(action) && demo) {
      const result = generateDemoFiscalResponse(action, data);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    const actionDef = ACTIONS[action];
    if (!actionDef) return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });

    const baseUrl = demo ? RS_GE_DEMO_URL : RS_GE_URL;
    const params = actionDef.buildParams(data || {}, su, sp);
    const soapBody = buildSoapEnvelope(actionDef.method, params);

    const soapResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `${NAMESPACE}${actionDef.method}`,
      },
      body: soapBody,
    });

    const responseXml = await soapResponse.text();
    
    if (!soapResponse.ok) {
      await auditLog(supabase, tenant_id, action, 'rsge', null, 'error', `HTTP ${soapResponse.status}`, demo, data, responseXml);
      return new Response(JSON.stringify({ error: `RS.GE Error: ${soapResponse.status}`, details: responseXml }), { status: 502, headers: corsHeaders });
    }

    const faultString = parseXmlValue(responseXml, 'faultstring');
    if (faultString) {
      await auditLog(supabase, tenant_id, action, 'rsge', null, 'error', faultString, demo, data, responseXml);
      return new Response(JSON.stringify({ error: faultString }), { status: 400, headers: corsHeaders });
    }

    const result = actionDef.parseResponse(responseXml);
    await auditLog(supabase, tenant_id, action, 'rsge', result.id || result.number || result.waybillId || null, 'success', null, demo, data, result);

    return new Response(JSON.stringify(result), { headers: corsHeaders });

  } catch (err: any) {
    console.error('RS.GE Proxy error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), { status: 500, headers: corsHeaders });
  }
});
