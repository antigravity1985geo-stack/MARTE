import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    LayoutDashboard,
    Monitor,
    Package,
    TrendingUp,
    Download,
    Users,
    Settings2,
    Heart,
    Plus,
    ShoppingCart,
    Box,
    Factory
} from 'lucide-react';

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import { useProducts } from '@/hooks/useProducts';
import { useUserRole } from '@/hooks/useUserRole';

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();
    const { products } = useProducts();
    const { hasAccess } = useUserRole();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    // Filter products for search (showing top 5 most recent if search is empty, or filtered)
    const navItems = [
        { title: 'მთავარი', icon: LayoutDashboard, path: '/', group: 'ნავიგაცია' },
        { title: 'POS სისტემა', icon: Monitor, path: '/pos', group: 'ნავიგაცია' },
        { title: 'პროდუქტები', icon: Package, path: '/products', group: 'მართვა' },
        { title: 'გაყიდვები', icon: TrendingUp, path: '/sales', group: 'მართვა' },
        { title: 'მიღება', icon: Download, path: '/receiving', group: 'მართვა' },
        { title: 'წარმოება', icon: Factory, path: '/production', group: 'მართვა' },
        { title: 'კლიენტები', icon: Users, path: '/clients', group: 'კონტაქტები' },
        { title: 'CRM & ლოიალობა', icon: Heart, path: '/crm', group: 'კონტაქტები' },
        { title: 'ბუღალტერია', icon: Calculator, path: '/accounting', group: 'ფინანსები' },
        { title: 'ავტომატური წესები', icon: Settings2, path: '/accounting-rules', group: 'ფინანსები' },
    ].filter(item => hasAccess(item.path));

    const actions = [
        { title: 'ახალი გაყიდვა', icon: Plus, action: () => navigate('/pos'), group: 'სწრაფი ქმედებები' },
        { title: 'პროდუქტის დამატება', icon: Plus, action: () => navigate('/products'), group: 'სწრაფი ქმედებები' },
        { title: 'ანგარიშის ნახვა', icon: Settings, action: () => navigate('/admin-panel'), group: 'პარამეტრები' },
    ];

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="მოძებნე ყველაფერი... (Ctrl+K)" />
            <CommandList>
                <CommandEmpty>შედეგი ვერ მოიძებნა.</CommandEmpty>

                <CommandGroup heading="სწრაფი ქმედებები">
                    {actions.map((item) => (
                        <CommandItem
                            key={item.title}
                            onSelect={() => runCommand(item.action)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="ნავიგაცია">
                    {navItems.map((item) => (
                        <CommandItem
                            key={item.path}
                            onSelect={() => runCommand(() => navigate(item.path))}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="პროდუქტები">
                    {products.slice(0, 10).map((product) => (
                        <CommandItem
                            key={product.id}
                            onSelect={() => runCommand(() => navigate(`/products?id=${product.id}`))}
                        >
                            <Box className="mr-2 h-4 w-4" />
                            <div className="flex flex-col">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-muted-foreground">{product.barcode} | {product.sell_price} ₾</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
