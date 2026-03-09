/// <reference lib="deno.ns" />
// @ts-nocheck
declare const Deno: any;
// RS.GE Proxy Edge Function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// RS.GE ფისკალური ჩეკის API
const RS_GE_FISCAL_URL = 'https://www.revenue.mof.ge/tax/api/cashregister';
const RS_GE_FISCAL_DEMO_URL = 'https://www.revenue.mof.ge/tax/api/cashregister';

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
  // ზედნადებების მიღება
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

  // კონკრეტული ზედნადები
  get_waybill: {
    method: 'get_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => {
      return { waybill: parseWaybillFromXml(xml) };
    },
  },

  // ზედნადების საქონლის სია
  get_waybill_goods_list: {
    method: 'get_waybill_goods_list',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => {
      return { goods: parseGoodsFromXml(xml) };
    },
  },

  // ზედნადების ტიპები
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

  // ზომის ერთეულები
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

  // ტრანსპორტის ტიპები
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

  // ზედნადების სტატუსები
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

  // ზედნადების შენახვა
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

  // ზედნადების გაგზავნა
  send_waybill: {
    method: 'send_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => {
      return { success: !xml.includes('ERROR'), message: parseXmlValue(xml, 'TEXT') || 'OK' };
    },
  },

  // ზედნადების დახურვა
  close_waybill: {
    method: 'close_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => {
      return { success: !xml.includes('ERROR'), message: parseXmlValue(xml, 'TEXT') || 'OK' };
    },
  },

  // ზედნადების წაშლა
  delete_waybill: {
    method: 'delete_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => {
      return { success: !xml.includes('ERROR') };
    },
  },

  // ზედნადების უარყოფა
  ref_waybill: {
    method: 'ref_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => {
      return { success: !xml.includes('ERROR') };
    },
  },

  // ზედნადების დადასტურება
  confirm_waybill: {
    method: 'confirm_waybill',
    buildParams: (data, su, sp) => ({ su, sp, waybill_id: data.waybillId }),
    parseResponse: (xml) => {
      return { success: !xml.includes('ERROR') };
    },
  },

  // მყიდველის ზედნადებები
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

  // დღგ-ს გადამხდელის შემოწმება
  is_vat_payer: {
    method: 'is_vat_payer',
    buildParams: (data, su, sp) => ({ su, sp, tin: data.tin }),
    parseResponse: (xml) => {
      const isVat = parseXmlValue(xml, 'IS_VAT_PAYER');
      return { isVatPayer: isVat === 'true' || isVat === '1', name: parseXmlValue(xml, 'NAME') || '' };
    },
  },

  // ბარკოდის ძებნა
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

  // IP მისამართი
  what_is_my_ip: {
    method: 'what_is_my_ip',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (xml) => {
      return { ip: parseXmlValue(xml, 'IP') || '' };
    },
  },

  // სერვის მომხმარებლები
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

  // კომპანიის ინფორმაცია
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

  // მყიდველის საიდენტიფიკაციო
  get_buyer_tin_from_rs: {
    method: 'get_name_from_tin',
    buildParams: (data, su, sp) => ({ su, sp, tin: data.tin }),
    parseResponse: (xml) => ({
      name: parseXmlValue(xml, 'NAME') || '',
      tin: parseXmlValue(xml, 'TIN') || '',
    }),
  },

  // ფისკალური ჩეკის შექმნა (დემო რეჟიმში ლოკალურად გენერირდება)
  create_fiscal_receipt: {
    method: 'create_fiscal_receipt',
    buildParams: (data, su, sp) => ({ su, sp, ...data }),
    parseResponse: (_xml) => ({}), // overridden in handler
  },

  // ფისკალური ჩეკის გაუქმება
  void_fiscal_receipt: {
    method: 'void_fiscal_receipt',
    buildParams: (data, su, sp) => ({ su, sp, receiptId: data.receiptId }),
    parseResponse: (_xml) => ({}),
  },

  // ფისკალური ცვლის გახსნა
  open_shift: {
    method: 'open_shift',
    buildParams: (data, su, sp) => ({ su, sp, cashierName: data.cashierName }),
    parseResponse: (_xml) => ({}),
  },

  // ფისკალური ცვლის დახურვა
  close_shift: {
    method: 'close_shift',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (_xml) => ({}),
  },

  // მიმდინარე ფისკალური ცვლა
  get_shift: {
    method: 'get_shift',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (_xml) => ({}),
  },

  // ფისკალური ჩეკების სია
  get_fiscal_receipts: {
    method: 'get_fiscal_receipts',
    buildParams: (_, su, sp) => ({ su, sp }),
    parseResponse: (_xml) => ({}),
  },

  // ინვოისები
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

  get_invoice: {
    method: 'get_invoice',
    buildParams: (data, su, sp) => ({ su, sp, invoice_id: data.invoiceId }),
    parseResponse: (xml) => ({
      id: parseXmlValue(xml, 'ID') || '',
      number: parseXmlValue(xml, 'NUMBER') || '',
      buyerTin: parseXmlValue(xml, 'BUYER_TIN') || '',
      buyerName: parseXmlValue(xml, 'BUYER_NAME') || '',
      total: parseFloat(parseXmlValue(xml, 'AMOUNT') || '0'),
    }),
  },

  save_invoice: {
    method: 'save_invoice',
    buildParams: (data, su, sp) => ({ su, sp, ...data }),
    parseResponse: (xml) => ({
      invoiceId: parseXmlValue(xml, 'ID') || '',
      success: true,
    }),
  },

  delete_invoice: {
    method: 'delete_invoice',
    buildParams: (data, su, sp) => ({ su, sp, invoice_id: data.invoiceId }),
    parseResponse: (xml) => ({ success: !xml.includes('ERROR') }),
  },
};

// ფისკალური actions რომლებიც დემო რეჟიმში ლოკალურად მუშაობს
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
      return {
        success: true,
        shift: { closedAt: now, isOpen: false },
      };
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if the request is POST and has a body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'მხოლოდ POST მოთხოვნებია დაშვებული' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'არასწორი JSON ფორმატი' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, demo, su, sp, data } = payload;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'მოთხოვნაში არ არის action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ფისკალური actions დემო რეჟიმში ლოკალურად მუშაობს
    if (FISCAL_ACTIONS.has(action) && demo) {
      const result = generateDemoFiscalResponse(action, data);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!su || !sp) {
      return new Response(
        JSON.stringify({ error: 'მოთხოვნაში არ არის su ან sp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actionDef = ACTIONS[action];
    if (!actionDef) {
      return new Response(
        JSON.stringify({ error: `უცნობი მოქმედება: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (!soapResponse.ok) {
      const errorText = await soapResponse.text();
      console.error('RS.GE SOAP error:', errorText);
      return new Response(
        JSON.stringify({ error: `RS.GE შეცდომა: ${soapResponse.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseXml = await soapResponse.text();

    // შევამოწმოთ SOAP Fault
    const faultString = parseXmlValue(responseXml, 'faultstring');
    if (faultString) {
      return new Response(
        JSON.stringify({ error: faultString }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = actionDef.parseResponse(responseXml);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('rsge-proxy error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message || 'სერვერის შეცდომა' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
