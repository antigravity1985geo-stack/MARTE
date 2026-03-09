import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">რაღაც შეცდომა მოხდა</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message || 'გთხოვთ სცადოთ თავიდან'}
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              თავიდან ცდა
            </Button>
            <Button onClick={() => window.location.reload()}>
              გვერდის განახლება
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
