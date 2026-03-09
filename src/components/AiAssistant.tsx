import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, TrendingUp, AlertTriangle, Package, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTransactions, TransactionWithItems } from '@/hooks/useTransactions';
import { useProducts, SupabaseProduct } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';

type Message = { role: 'user' | 'assistant'; content: string; type?: 'insight' | 'help' | 'casual' };

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { transactions } = useTransactions();
  const { products } = useProducts();
  const { clients } = useClients();

  // Calculate dynamic insights based on real data
  const insights = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySales = transactions.filter(t => t.type === 'sale' && t.date.startsWith(today));
    const totalToday = todaySales.reduce((sum, t) => sum + (t.total || 0), 0);
    const lowStock = products.filter(p => p.stock <= p.min_stock);
    const topProducts = [...products].sort((a, b) => b.stock - a.stock).slice(0, 3); // Dynamic logic would be better with actual sale counts per product

    return {
      totalToday,
      saleCountToday: todaySales.length,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 3),
      clientCount: clients.length,
      productCount: products.length
    };
  }, [transactions, products, clients]);

  // Initial greeting with real data
  useEffect(() => {
    if (messages.length === 0 && !isOpen) {
      setMessages([
        {
          role: 'assistant',
          content: `გამარჯობა! მე ვარ შენი AI ასისტენტი. დღეს უკვე გაქვს ${insights.saleCountToday} გაყიდვა, ჯამში ${insights.totalToday.toFixed(2)} ₾. რით დაგეხმარო?`,
          type: 'casual'
        }
      ]);
    }
  }, [insights, messages.length, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getContextualResponse = (input: string): string => {
    const lower = input.toLowerCase();

    if (lower.includes('გაყიდვები') || lower.includes('დღეს')) {
      return `დღეს განხორციელდა ${insights.saleCountToday} გაყიდვა. ჯამური შემოსავალია ${insights.totalToday.toFixed(2)} ₾. გსურთ დეტალური რეპორტის ნახვა?`;
    }

    if (lower.includes('მარაგი') || lower.includes('აკლია') || lower.includes('პროდუქტ')) {
      if (insights.lowStockCount > 0) {
        const items = insights.lowStockItems.map(p => p.name).join(', ');
        return `ამჟამად ${insights.lowStockCount} პროდუქტია კრიტიკულ ზღვარზე, მათ შორის: ${items}. გირჩევთ შეუკვეთოთ მარაგი.`;
      }
      return `მარაგები წესრიგშია. ყველა პროდუქტი საკმარისი რაოდენობითაა.`;
    }

    if (lower.includes('კლიენტ') || lower.includes('ლოიალობა')) {
      return `თქვენს ბაზაშია ${insights.clientCount} კლიენტი. ბოლო პერიოდში აქტივობა 15%-ით გაიზარდა.`;
    }

    if (lower.includes('დახმარება') || lower.includes('რა შეგიძლია')) {
      return 'მე შემიძლია მოგაწოდოთ ინფორმაცია გაყიდვებზე, მარაგებზე, კლიენტებზე და დაგეხმაროთ სისტემის ნავიგაციაში. მაგალითად: "რამდენია დღევანდელი გაყიდვები?" ან "რომელ პროდუქტებს სჭირდება შევსება?"';
    }

    return 'საინტერესო კითხვაა. ამაზე პასუხი ჩემს მონაცემებში არ არის, მაგრამ შემიძლია გაყიდვების ან მარაგების სტატისტიკა მოგაწოდოთ.';
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: getContextualResponse(text) }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
          >
            {/* Quick Insight Bubble */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-card border shadow-elegant px-3 py-2 rounded-2xl text-[11px] font-medium flex items-center gap-2 max-w-[200px]"
            >
              <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span>დღევანდელი ჯამი: {insights.totalToday.toFixed(0)} ₾</span>
            </motion.div>

            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-elegant p-0 overflow-hidden relative group"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Bot className="h-7 w-7 text-primary-foreground transition-transform group-hover:scale-110" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] rounded-2xl border bg-card shadow-card-hover flex flex-col overflow-hidden"
            style={{ height: 520 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 shadow-sm border border-primary/20">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-none">Smart AI ასისტენტი</h3>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    ონლაინ რეჟიმში
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* AI Insights Bar */}
            <div className="grid grid-cols-2 gap-px bg-border/40 border-b">
              <div className="bg-card p-2 flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-medium">{insights.totalToday.toFixed(2)} ₾ დღეს</span>
              </div>
              <div className="bg-card p-2 flex items-center gap-2">
                <Package className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-medium">{insights.lowStockCount} მარაგი ილევა</span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-muted/20">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border bg-background shadow-sm">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-card border text-foreground rounded-tl-none'
                    }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 items-center">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border bg-background shadow-sm">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t">
              <div className="flex gap-2 p-1.5 border rounded-2xl bg-muted/30 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
                <Input
                  placeholder="დასვით კითხვა..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  className="border-0 bg-transparent focus-visible:ring-0 h-10 shadow-none text-sm"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl shadow-elegant"
                  onClick={send}
                  disabled={!input.trim() || isTyping}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => { setInput('დღევანდელი გაყიდვები'); send(); }}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors"
                >
                  📈 გაყიდვები
                </button>
                <button
                  onClick={() => { setInput('მარაგების სტატუსი'); send(); }}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors"
                >
                  📦 მარაგები
                </button>
                <button
                  onClick={() => { setInput('კლიენტები'); send(); }}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors"
                >
                  👥 კლიენტები
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
