import { useState, useEffect } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ArrowRightLeft, TrendingUp, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  change: number;
  date: string;
}

interface ConversionRecord {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  date: string;
}

const defaultRates: CurrencyRate[] = [
  { code: 'USD', name: 'აშშ დოლარი', rate: 2.6845, change: -0.0012, date: new Date().toISOString().split('T')[0] },
  { code: 'EUR', name: 'ევრო', rate: 2.9234, change: 0.0045, date: new Date().toISOString().split('T')[0] },
  { code: 'GBP', name: 'ბრიტანული ფუნტი', rate: 3.4012, change: -0.0023, date: new Date().toISOString().split('T')[0] },
  { code: 'TRY', name: 'თურქული ლირა', rate: 0.0782, change: -0.0003, date: new Date().toISOString().split('T')[0] },
  { code: 'RUB', name: 'რუსული რუბლი', rate: 0.0294, change: 0.0001, date: new Date().toISOString().split('T')[0] },
  { code: 'UAH', name: 'უკრაინული გრივნა', rate: 0.0649, change: -0.0002, date: new Date().toISOString().split('T')[0] },
  { code: 'AZN', name: 'აზერბაიჯანული მანათი', rate: 1.5791, change: 0.0008, date: new Date().toISOString().split('T')[0] },
  { code: 'AMD', name: 'სომხური დრამი', rate: 0.0069, change: 0.0000, date: new Date().toISOString().split('T')[0] },
];

export default function CurrencyPage() {
  const [rates, setRates] = useState<CurrencyRate[]>(defaultRates);
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [convertForm, setConvertForm] = useState({ fromCurrency: 'USD', toCurrency: 'GEL', amount: '' });

  const fetchNBGRates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/?currencies=USD,EUR,GBP,TRY,RUB,UAH,AZN,AMD');
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]?.currencies) {
          const newRates: CurrencyRate[] = data[0].currencies.map((c: any) => ({
            code: c.code,
            name: c.name || c.code,
            rate: c.rate / (c.quantity || 1),
            change: c.diff || 0,
            date: data[0].date?.split('T')[0] || new Date().toISOString().split('T')[0],
          }));
          setRates(newRates);
          toast.success('კურსები განახლდა ეროვნული ბანკიდან');
        }
      } else {
        toast.info('ეროვნული ბანკის API მიუწვდომელია, ნაჩვენებია სადემონსტრაციო კურსები');
      }
    } catch {
      toast.info('კურსები ვერ განახლდა, ნაჩვენებია სადემონსტრაციო კურსები');
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchNBGRates(); }, []);

  const handleConvert = () => {
    const amount = parseFloat(convertForm.amount);
    if (!amount) { toast.error('შეიყვანეთ თანხა'); return; }

    let result: number;
    const fromRate = rates.find(r => r.code === convertForm.fromCurrency);
    const toRate = rates.find(r => r.code === convertForm.toCurrency);

    if (convertForm.fromCurrency === 'GEL') {
      result = toRate ? amount / toRate.rate : amount;
    } else if (convertForm.toCurrency === 'GEL') {
      result = fromRate ? amount * fromRate.rate : amount;
    } else {
      const gelAmount = fromRate ? amount * fromRate.rate : amount;
      result = toRate ? gelAmount / toRate.rate : gelAmount;
    }

    const rate = amount > 0 ? result / amount : 0;

    setConversions(prev => [{
      id: crypto.randomUUID(),
      fromCurrency: convertForm.fromCurrency,
      toCurrency: convertForm.toCurrency,
      fromAmount: amount,
      toAmount: result,
      rate,
      date: new Date().toISOString(),
    }, ...prev]);

    toast.success(`${amount} ${convertForm.fromCurrency} = ${result.toFixed(4)} ${convertForm.toCurrency}`);
  };

  const allCurrencies = ['GEL', ...rates.map(r => r.code)];

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">ვალუტა & კურსები</h1>
          <Button onClick={fetchNBGRates} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            კურსის განახლება (NBG)
          </Button>
        </div>

        <Tabs defaultValue="rates">
          <TabsList>
            <TabsTrigger value="rates"><Globe className="mr-1 h-3 w-3" />კურსები</TabsTrigger>
            <TabsTrigger value="convert"><ArrowRightLeft className="mr-1 h-3 w-3" />კონვერტაცია</TabsTrigger>
            <TabsTrigger value="history"><TrendingUp className="mr-1 h-3 w-3" />ისტორია</TabsTrigger>
          </TabsList>

          <TabsContent value="rates" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {rates.slice(0, 4).map(r => (
                <Card key={r.code}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{r.code}/GEL</p>
                        <p className="text-xl font-bold">{r.rate.toFixed(4)}</p>
                      </div>
                      <Badge variant={r.change >= 0 ? 'default' : 'destructive'} className="text-xs">
                        {r.change >= 0 ? '+' : ''}{r.change.toFixed(4)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="stat-card overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>კოდი</TableHead>
                    <TableHead>ვალუტა</TableHead>
                    <TableHead className="text-right">კურსი (GEL)</TableHead>
                    <TableHead className="text-right">ცვლილება</TableHead>
                    <TableHead>თარიღი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map(r => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono font-bold">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right font-semibold">{r.rate.toFixed(4)}</TableCell>
                      <TableCell className={`text-right ${r.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {r.change >= 0 ? '+' : ''}{r.change.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm">{r.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="convert" className="mt-4">
            <Card>
              <CardHeader><CardTitle>ვალუტის კონვერტაცია</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <Label>საიდან</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={convertForm.fromCurrency} onChange={e => setConvertForm(prev => ({ ...prev, fromCurrency: e.target.value }))}>
                      {allCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>თანხა</Label>
                    <Input type="number" value={convertForm.amount} onChange={e => setConvertForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <Label>სად</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={convertForm.toCurrency} onChange={e => setConvertForm(prev => ({ ...prev, toCurrency: e.target.value }))}>
                      {allCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <Button onClick={handleConvert}><ArrowRightLeft className="mr-2 h-4 w-4" />კონვერტაცია</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="stat-card overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>თარიღი</TableHead>
                    <TableHead>საიდან</TableHead>
                    <TableHead>თანხა</TableHead>
                    <TableHead>სად</TableHead>
                    <TableHead>შედეგი</TableHead>
                    <TableHead>კურსი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">კონვერტაციები არ არის</TableCell></TableRow>
                  ) : conversions.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{new Date(c.date).toLocaleDateString('ka')}</TableCell>
                      <TableCell className="font-mono">{c.fromCurrency}</TableCell>
                      <TableCell className="font-semibold">{c.fromAmount.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{c.toCurrency}</TableCell>
                      <TableCell className="font-semibold text-primary">{c.toAmount.toFixed(4)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.rate.toFixed(6)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
