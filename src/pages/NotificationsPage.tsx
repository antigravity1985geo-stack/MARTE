import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Bell, Mail, MessageSquare, Send, Settings, Plus, Clock,
  CheckCircle, AlertCircle, Users, ShoppingBag, Package,
  Truck, CreditCard, Star, Megaphone, Eye, Zap, Filter,
  MailOpen, Phone, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationTemplate {
  id: string;
  name: string;
  event: string;
  channel: 'sms' | 'email' | 'both';
  smsTemplate: string;
  emailSubject: string;
  emailBody: string;
  active: boolean;
  variables: string[];
}

interface NotificationLog {
  id: string;
  templateName: string;
  channel: 'sms' | 'email';
  recipient: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sentAt: string;
  event: string;
  preview: string;
}

interface NotificationRule {
  id: string;
  name: string;
  trigger: string;
  conditions: string;
  channels: ('sms' | 'email')[];
  templateId: string;
  active: boolean;
  sentCount: number;
}

const EVENT_TYPES = [
  { value: 'order_created', label: 'შეკვეთის შექმნა', icon: ShoppingBag },
  { value: 'order_confirmed', label: 'შეკვეთის დადასტურება', icon: CheckCircle },
  { value: 'order_shipped', label: 'შეკვეთის გაგზავნა', icon: Truck },
  { value: 'order_delivered', label: 'შეკვეთის მიწოდება', icon: Package },
  { value: 'order_cancelled', label: 'შეკვეთის გაუქმება', icon: AlertCircle },
  { value: 'payment_received', label: 'გადახდის მიღება', icon: CreditCard },
  { value: 'low_stock', label: 'მარაგის შემცირება', icon: AlertCircle },
  { value: 'loyalty_upgrade', label: 'ლოიალობის დონის ცვლილება', icon: Star },
  { value: 'promotion', label: 'აქციის შეტყობინება', icon: Megaphone },
];

const DEMO_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'T1', name: 'შეკვეთის დადასტურება', event: 'order_confirmed', channel: 'both',
    smsTemplate: 'გამარჯობა {customer_name}! თქვენი შეკვეთა #{order_id} დადასტურებულია. სავარაუდო მიწოდება: {delivery_time}. MARTE',
    emailSubject: 'შეკვეთა #{order_id} დადასტურებულია',
    emailBody: 'პატივცემულო {customer_name},\n\nთქვენი შეკვეთა #{order_id} წარმატებით დადასტურდა.\n\nშეკვეთის თანხა: {total} ₾\nსავარაუდო მიწოდება: {delivery_time}\n\nმადლობა რომ გვირჩევთ!\nMARTE',
    active: true,
    variables: ['customer_name', 'order_id', 'total', 'delivery_time'],
  },
  {
    id: 'T2', name: 'შეკვეთის გაგზავნა', event: 'order_shipped', channel: 'sms',
    smsTemplate: '{customer_name}, თქვენი შეკვეთა #{order_id} გაგზავნილია! მძღოლი: {driver_name}, სავარაუდო მიწოდება: {delivery_time}',
    emailSubject: '', emailBody: '', active: true,
    variables: ['customer_name', 'order_id', 'driver_name', 'delivery_time'],
  },
  {
    id: 'T3', name: 'შეკვეთის მიწოდება', event: 'order_delivered', channel: 'both',
    smsTemplate: '{customer_name}, შეკვეთა #{order_id} მიწოდებულია! გმადლობთ ყიდვისთვის. შეაფასეთ: {rating_link}',
    emailSubject: 'შეკვეთა #{order_id} მიწოდებულია!',
    emailBody: 'პატივცემულო {customer_name},\n\nთქვენი შეკვეთა #{order_id} წარმატებით მიწოდებულია.\n\nგთხოვთ შეაფასოთ მომსახურება: {rating_link}\n\nმადლობა!',
    active: true,
    variables: ['customer_name', 'order_id', 'rating_link'],
  },
  {
    id: 'T4', name: 'გადახდის მიღება', event: 'payment_received', channel: 'email',
    smsTemplate: '', emailSubject: 'გადახდა მიღებულია — {total} ₾',
    emailBody: 'პატივცემულო {customer_name},\n\nთქვენი გადახდა {total} ₾ წარმატებით მიღებულია.\n\nინვოისი: #{invoice_id}\nთარიღი: {date}\n\nმადლობა!',
    active: true,
    variables: ['customer_name', 'total', 'invoice_id', 'date'],
  },
  {
    id: 'T5', name: 'მარაგის შეტყობინება', event: 'low_stock', channel: 'email',
    smsTemplate: '', emailSubject: '⚠️ დაბალი მარაგი: {product_name}',
    emailBody: 'ყურადღება!\n\nპროდუქტის "{product_name}" მარაგი შემცირდა {stock_count} ერთეულამდე.\n\nგთხოვთ შეავსოთ მარაგი.',
    active: true,
    variables: ['product_name', 'stock_count'],
  },
];

const DEMO_LOGS: NotificationLog[] = [
  { id: 'L1', templateName: 'შეკვეთის დადასტურება', channel: 'sms', recipient: '+995 555 11 22 33', status: 'delivered', sentAt: '14:32', event: 'order_confirmed', preview: 'გამარჯობა ანა! თქვენი შეკვეთა #1042 დადასტურებულია...' },
  { id: 'L2', templateName: 'შეკვეთის დადასტურება', channel: 'email', recipient: 'ana@mail.ge', status: 'delivered', sentAt: '14:32', event: 'order_confirmed', preview: 'შეკვეთა #1042 დადასტურებულია' },
  { id: 'L3', templateName: 'შეკვეთის გაგზავნა', channel: 'sms', recipient: '+995 555 44 55 66', status: 'delivered', sentAt: '13:15', event: 'order_shipped', preview: 'გიორგი, თქვენი შეკვეთა #1038 გაგზავნილია...' },
  { id: 'L4', templateName: 'შეკვეთის მიწოდება', channel: 'email', recipient: 'mariam@mail.ge', status: 'sent', sentAt: '12:45', event: 'order_delivered', preview: 'შეკვეთა #1035 მიწოდებულია!' },
  { id: 'L5', templateName: 'გადახდის მიღება', channel: 'email', recipient: 'davit@mail.ge', status: 'failed', sentAt: '11:30', event: 'payment_received', preview: 'გადახდა მიღებულია — 125 ₾' },
  { id: 'L6', templateName: 'მარაგის შეტყობინება', channel: 'email', recipient: 'admin@store.ge', status: 'delivered', sentAt: '10:00', event: 'low_stock', preview: '⚠️ დაბალი მარაგი: პური' },
  { id: 'L7', templateName: 'შეკვეთის დადასტურება', channel: 'sms', recipient: '+995 555 00 11 22', status: 'pending', sentAt: '14:45', event: 'order_confirmed', preview: 'გამარჯობა ლევან! თქვენი შეკვეთა #1043...' },
];

const DEMO_RULES: NotificationRule[] = [
  { id: 'NR1', name: 'შეკვეთის დადასტურების ნოტიფიკაცია', trigger: 'order_confirmed', conditions: 'ყველა შეკვეთა', channels: ['sms', 'email'], templateId: 'T1', active: true, sentCount: 1250 },
  { id: 'NR2', name: 'მიწოდების შეტყობინება', trigger: 'order_shipped', conditions: 'ყველა შეკვეთა', channels: ['sms'], templateId: 'T2', active: true, sentCount: 890 },
  { id: 'NR3', name: 'მიწოდების დადასტურება', trigger: 'order_delivered', conditions: 'ყველა შეკვეთა', channels: ['sms', 'email'], templateId: 'T3', active: true, sentCount: 845 },
  { id: 'NR4', name: 'გადახდის ქვითარი', trigger: 'payment_received', conditions: 'თანხა > 50₾', channels: ['email'], templateId: 'T4', active: true, sentCount: 560 },
  { id: 'NR5', name: 'მარაგის გაფრთხილება', trigger: 'low_stock', conditions: 'მარაგი < 10', channels: ['email'], templateId: 'T5', active: true, sentCount: 45 },
];

export default function NotificationsPage() {
  const [templates, setTemplates] = useState(DEMO_TEMPLATES);
  const [logs] = useState(DEMO_LOGS);
  const [rules, setRules] = useState(DEMO_RULES);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [testDialog, setTestDialog] = useState<NotificationTemplate | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [logFilter, setLogFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');

  const [newTemplate, setNewTemplate] = useState({
    name: '', event: '', channel: 'both' as 'sms' | 'email' | 'both',
    smsTemplate: '', emailSubject: '', emailBody: '',
  });

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.event) return;
    setTemplates(prev => [...prev, {
      id: `T${Date.now()}`, ...newTemplate, active: true, variables: [],
    }]);
    setNewTemplate({ name: '', event: '', channel: 'both', smsTemplate: '', emailSubject: '', emailBody: '' });
    setTemplateDialog(false);
    toast.success('შაბლონი შეიქმნა');
  };

  const sendTest = () => {
    if (!testRecipient || !testDialog) return;
    toast.success(`ტესტ შეტყობინება გაიგზავნა: ${testRecipient}`);
    setTestDialog(null);
    setTestRecipient('');
  };

  const filteredLogs = logs.filter(l => {
    if (logFilter !== 'all' && l.status !== logFilter) return false;
    if (channelFilter !== 'all' && l.channel !== channelFilter) return false;
    return true;
  });

  const totalSent = logs.length;
  const delivered = logs.filter(l => l.status === 'delivered').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;

  const statusBadge = (status: NotificationLog['status']) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      sent: { label: 'გაგზავნილი', variant: 'outline' },
      delivered: { label: 'მიწოდებული', variant: 'default' },
      failed: { label: 'შეცდომა', variant: 'destructive' },
      pending: { label: 'მოლოდინში', variant: 'secondary' },
    };
    const s = map[status];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">შეტყობინებები</h1>
          <p className="text-muted-foreground">SMS & Email ნოტიფიკაციები — ავტომატური შეტყობინებების მართვა</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Send className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalSent}</p><p className="text-xs text-muted-foreground">გაგზავნილი დღეს</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{deliveryRate}%</p><p className="text-xs text-muted-foreground">მიწოდების რეიტი</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertCircle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{failed}</p><p className="text-xs text-muted-foreground">შეცდომა</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Zap className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{rules.filter(r => r.active).length}</p><p className="text-xs text-muted-foreground">აქტიური წესი</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules"><Zap className="h-4 w-4 mr-1" />ავტომატიზაცია</TabsTrigger>
          <TabsTrigger value="templates"><Mail className="h-4 w-4 mr-1" />შაბლონები</TabsTrigger>
          <TabsTrigger value="logs"><Clock className="h-4 w-4 mr-1" />ისტორია</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />პარამეტრები</TabsTrigger>
        </TabsList>

        {/* RULES TAB */}
        <TabsContent value="rules" className="space-y-4">
          <div className="space-y-3">
            {rules.map(rule => {
              const eventInfo = EVENT_TYPES.find(e => e.value === rule.trigger);
              const EventIcon = eventInfo?.icon || Bell;
              return (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10"><EventIcon className="h-5 w-5 text-primary" /></div>
                        <div>
                          <h3 className="font-semibold">{rule.name}</h3>
                          <p className="text-xs text-muted-foreground">ტრიგერი: {eventInfo?.label} · პირობა: {rule.conditions}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {rule.channels.includes('sms') && <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-0.5" />SMS</Badge>}
                          {rule.channels.includes('email') && <Badge variant="outline"><Mail className="h-3 w-3 mr-0.5" />Email</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{rule.sentCount} გაგზავნილი</span>
                        <Switch checked={rule.active} onCheckedChange={v => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: v } : r))} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />ახალი შაბლონი</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>ახალი შეტყობინების შაბლონი</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>სახელი</Label><Input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>მოვლენა</Label>
                    <Select value={newTemplate.event} onValueChange={v => setNewTemplate(p => ({ ...p, event: v }))}>
                      <SelectTrigger><SelectValue placeholder="აირჩიეთ მოვლენა" /></SelectTrigger>
                      <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>არხი</Label>
                    <Select value={newTemplate.channel} onValueChange={v => setNewTemplate(p => ({ ...p, channel: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="both">ორივე</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(newTemplate.channel === 'sms' || newTemplate.channel === 'both') && (
                    <div><Label>SMS ტექსტი</Label><Textarea value={newTemplate.smsTemplate} onChange={e => setNewTemplate(p => ({ ...p, smsTemplate: e.target.value }))} placeholder="გამოიყენეთ {variable_name} ცვლადებისთვის" rows={3} /></div>
                  )}
                  {(newTemplate.channel === 'email' || newTemplate.channel === 'both') && (
                    <>
                      <div><Label>Email სათაური</Label><Input value={newTemplate.emailSubject} onChange={e => setNewTemplate(p => ({ ...p, emailSubject: e.target.value }))} /></div>
                      <div><Label>Email ტექსტი</Label><Textarea value={newTemplate.emailBody} onChange={e => setNewTemplate(p => ({ ...p, emailBody: e.target.value }))} rows={5} /></div>
                    </>
                  )}
                  <Button className="w-full" onClick={addTemplate}>შექმნა</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map(template => {
              const eventInfo = EVENT_TYPES.find(e => e.value === template.event);
              return (
                <Card key={template.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{template.name}</h3>
                      <div className="flex items-center gap-2">
                        <Switch checked={template.active} onCheckedChange={v => setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, active: v } : t))} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{eventInfo?.label}</Badge>
                      {(template.channel === 'sms' || template.channel === 'both') && <Badge variant="secondary"><MessageSquare className="h-3 w-3 mr-0.5" />SMS</Badge>}
                      {(template.channel === 'email' || template.channel === 'both') && <Badge variant="secondary"><Mail className="h-3 w-3 mr-0.5" />Email</Badge>}
                    </div>
                    {template.smsTemplate && (
                      <div className="p-2 rounded bg-muted/50 text-xs"><p className="font-medium mb-1 text-muted-foreground">SMS:</p><p>{template.smsTemplate.slice(0, 100)}...</p></div>
                    )}
                    {template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">{template.variables.map(v => <Badge key={v} variant="outline" className="text-[10px] font-mono">{`{${v}}`}</Badge>)}</div>
                    )}
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setTestDialog(template)}><Send className="h-3 w-3 mr-1" />ტესტ გაგზავნა</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-2">
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="სტატუსი" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                <SelectItem value="delivered">მიწოდებული</SelectItem>
                <SelectItem value="sent">გაგზავნილი</SelectItem>
                <SelectItem value="failed">შეცდომა</SelectItem>
                <SelectItem value="pending">მოლოდინში</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="არხი" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>დრო</TableHead>
                    <TableHead>შაბლონი</TableHead>
                    <TableHead>არხი</TableHead>
                    <TableHead>მიმღები</TableHead>
                    <TableHead>შეტყობინება</TableHead>
                    <TableHead>სტატუსი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.sentAt}</TableCell>
                      <TableCell className="font-medium">{log.templateName}</TableCell>
                      <TableCell>{log.channel === 'sms' ? <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-0.5" />SMS</Badge> : <Badge variant="outline"><Mail className="h-3 w-3 mr-0.5" />Email</Badge>}</TableCell>
                      <TableCell className="text-sm">{log.recipient}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.preview}</TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />SMS პარამეტრები</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>SMS პროვაიდერი</Label>
                  <Select defaultValue="magti"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="magti">Magticom SMS</SelectItem>
                      <SelectItem value="geocell">Geocell SMS</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>API Key</Label><Input type="password" placeholder="SMS API Key" /></div>
                <div><Label>გამგზავნის სახელი</Label><Input defaultValue="MARTE" /></div>
                <div className="flex items-center justify-between">
                  <Label>SMS ნოტიფიკაციები ჩართული</Label>
                  <Switch defaultChecked />
                </div>
                <Button variant="outline" className="w-full"><Send className="h-4 w-4 mr-1" />ტესტ SMS</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Email პარამეტრები</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Email პროვაიდერი</Label>
                  <Select defaultValue="smtp"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>SMTP სერვერი</Label><Input placeholder="smtp.example.com" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>პორტი</Label><Input defaultValue="587" /></div>
                  <div><Label>პაროლი</Label><Input type="password" /></div>
                </div>
                <div><Label>გამგზავნის Email</Label><Input defaultValue="info@store.ge" /></div>
                <div className="flex items-center justify-between">
                  <Label>Email ნოტიფიკაციები ჩართული</Label>
                  <Switch defaultChecked />
                </div>
                <Button variant="outline" className="w-full"><Send className="h-4 w-4 mr-1" />ტესტ Email</Button>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">გაგზავნის ლიმიტები</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>SMS დღიური ლიმიტი</Label><Input type="number" defaultValue="500" /></div>
                <div><Label>Email დღიური ლიმიტი</Label><Input type="number" defaultValue="2000" /></div>
                <div><Label>მინიმუმ ინტერვალი (წმ)</Label><Input type="number" defaultValue="10" /></div>
              </div>
              <div className="flex items-center justify-between">
                <Label>არასამუშაო საათებში გაგზავნა (22:00-08:00)</Label>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Dialog */}
      <Dialog open={!!testDialog} onOpenChange={open => { if (!open) setTestDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>ტესტ შეტყობინება — {testDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>მიმღები ({testDialog?.channel === 'sms' ? 'ტელეფონი' : testDialog?.channel === 'email' ? 'Email' : 'ტელეფონი ან Email'})</Label>
              <Input value={testRecipient} onChange={e => setTestRecipient(e.target.value)} placeholder={testDialog?.channel === 'email' ? 'example@mail.ge' : '+995 555 00 00 00'} />
            </div>
            {testDialog?.smsTemplate && <div className="p-3 rounded bg-muted/50 text-sm"><p className="text-xs font-medium text-muted-foreground mb-1">SMS Preview:</p>{testDialog.smsTemplate}</div>}
            {testDialog?.emailSubject && <div className="p-3 rounded bg-muted/50 text-sm"><p className="text-xs font-medium text-muted-foreground mb-1">Email Preview:</p><p className="font-medium">{testDialog.emailSubject}</p><p className="mt-1 whitespace-pre-line">{testDialog.emailBody}</p></div>}
            <Button className="w-full" onClick={sendTest}><Send className="h-4 w-4 mr-1" />გაგზავნა</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}