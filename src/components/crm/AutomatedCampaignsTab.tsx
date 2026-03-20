import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Gift, Clock, Sparkles, Send, Edit, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { AutomatedCampaignRule } from '@/hooks/useClients';
import { useI18n } from '@/hooks/useI18n';

interface Props {
  rules: AutomatedCampaignRule[];
  updateRule: any;
  triggerCampaigns: any;
}

export function AutomatedCampaignsTab({ rules, updateRule, triggerCampaigns }: Props) {
  const { t } = useI18n();
  const [editingRule, setEditingRule] = useState<AutomatedCampaignRule | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [editedValue, setEditedValue] = useState<number | ''>('');

  const handleToggle = (id: string, current: boolean) => {
    updateRule.mutate({ id, updates: { is_active: !current } });
    if (!current) {
        toast.success('ავტომატიზაცია ჩაირთო');
    } else {
        toast.info('ავტომატიზაცია გამოირთო');
    }
  };

  const openEdit = (rule: AutomatedCampaignRule) => {
    setEditingRule(rule);
    setEditedMessage(rule.message_template);
    setEditedValue(rule.trigger_value === null ? '' : rule.trigger_value);
  };

  const saveEdit = () => {
    if (!editingRule) return;
    updateRule.mutate({
      id: editingRule.id,
      updates: {
        message_template: editedMessage,
        trigger_value: editedValue === '' ? null : Number(editedValue)
      }
    }, {
      onSuccess: () => {
        toast.success(t('success') || 'შენახულია');
        setEditingRule(null);
      }
    });
  };

  const runNow = () => {
    toast.promise(triggerCampaigns.mutateAsync(), {
      loading: 'ავტომატიზაციის გაშვება...',
      success: (data: any) => `ავტომატიზაცია დასრულდა. გაიგზავნა ${data?.messages_sent || 0} მესიჯი.`,
      error: 'მოხდა შეცდომა'
    });
  };

  const getIcon = (type: string) => {
    if (type === 'birthday') return <Gift className="h-5 w-5 text-pink-500" />;
    if (type === 'days_inactive') return <Clock className="h-5 w-5 text-orange-500" />;
    if (type === 'tier_upgrade') return <Sparkles className="h-5 w-5 text-yellow-500" />;
    return <Send className="h-5 w-5 text-primary" />;
  };

  if (!rules || rules.length === 0) {
      return (
          <div className="text-center py-12 text-muted-foreground">
              ავტომატიზაციის წესები არ მოიძებნა.
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">ავტომატური კამპანიები</h2>
          <p className="text-sm text-muted-foreground">სისტემა ამოწმებს კრიტერიუმებს და ავტომატურად უგზავნის მომხმარებლებს მესიჯებს.</p>
        </div>
        <Button onClick={runNow} disabled={triggerCampaigns.isPending} variant="secondary">
          {triggerCampaigns.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          ახლავე გადამოწმება
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {rules.map(rule => (
          <Card key={rule.id} className={rule.is_active ? 'border-primary/50' : 'opacity-75'}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-muted rounded-md">{getIcon(rule.trigger_type)}</div>
                  <div>
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <CardDescription>
                      {rule.trigger_type === 'birthday' && 'დაბადების დღეს მიულოცავს'}
                      {rule.trigger_type === 'days_inactive' && `თუ წინა შესყიდვიდან გავიდა ${rule.trigger_value} დღე`}
                      {rule.trigger_type === 'tier_upgrade' && 'სტატუსის ამაღლებისას (დაემატება მალე)'}
                    </CardDescription>
                  </div>
                </div>
                <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule.id, rule.is_active)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted/50 rounded-md text-sm mb-3 relative text-foreground">
                <span className="text-muted-foreground block mb-1">SMS ტექსტი:</span>
                "{rule.message_template}"
              </div>
              <div className="flex items-center justify-between">
                <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                  {rule.is_active ? 'ჩართულია' : 'გამორთულია'}
                </Badge>
                
                <Dialog open={editingRule?.id === rule.id} onOpenChange={(val) => !val && setEditingRule(null)}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Edit className="h-4 w-4 mr-1"/>რედაქტირება</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{rule.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      {rule.trigger_type === 'days_inactive' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">დღეების რაოდენობა (დაგვიანება)</label>
                          <Input type="number" value={editedValue} onChange={e => setEditedValue(e.target.value ? Number(e.target.value) : '')} />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">მესიჯის ტექსტი</label>
                        <Textarea rows={4} value={editedMessage} onChange={e => setEditedMessage(e.target.value)} />
                      </div>
                      <Button className="w-full" onClick={saveEdit}>შენახვა</Button>
                    </div>
                  </DialogContent>
                </Dialog>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
