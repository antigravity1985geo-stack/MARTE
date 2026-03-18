import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, Percent, Calendar, DollarSign } from 'lucide-react';

export function MortgageCalculator() {
  const [price, setPrice] = useState(250000);
  const [downPayment, setDownPayment] = useState(50000);
  const [interestRate, setInterestRate] = useState(5);
  const [years, setYears] = useState(20);
  const [monthlyPayment, setMonthlyPayment] = useState(0);

  useEffect(() => {
    const principal = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = years * 12;

    if (monthlyRate === 0) {
      setMonthlyPayment(principal / numberOfPayments);
    } else {
      const payment =
        (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
      setMonthlyPayment(payment);
    }
  }, [price, downPayment, interestRate, years]);

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden h-full">
      <CardHeader className="bg-primary/10 border-b border-primary/20 pb-4">
        <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          იპოთეკის კალკულატორი
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-slate-400 font-bold uppercase text-[10px]">ქონების ფასი</Label>
              <span className="text-lg font-black text-white">${price.toLocaleString()}</span>
            </div>
            <Slider 
              value={[price]} 
              min={10000} 
              max={1000000} 
              step={10000} 
              onValueChange={(v) => setPrice(v[0])}
              className="py-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-400 font-bold uppercase text-[10px]">პირველადი შენატანი</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  type="number" 
                  value={downPayment} 
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="bg-white/5 border-white/10 pl-9 rounded-xl focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400 font-bold uppercase text-[10px]">პროცენტი (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  type="number" 
                  value={interestRate} 
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="bg-white/5 border-white/10 pl-9 rounded-xl focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-slate-400 font-bold uppercase text-[10px]">ვადა (წლები)</Label>
              <span className="text-lg font-black text-white">{years} წელი</span>
            </div>
            <Slider 
              value={[years]} 
              min={1} 
              max={30} 
              step={1} 
              onValueChange={(v) => setYears(v[0])}
              className="py-4"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-white/5">
          <div className="bg-primary/20 border border-primary/20 rounded-2xl p-6 text-center shadow-lg shadow-primary/5">
            <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">ყოველთვიური გადასახადი</p>
            <h2 className="text-4xl font-black text-white italic">
              ${Math.round(monthlyPayment).toLocaleString()}
            </h2>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
