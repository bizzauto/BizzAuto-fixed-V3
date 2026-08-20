import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  pageName?: string;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary] ${this.props.pageName || 'Page'} error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            {this.props.fallbackMessage || 'An unexpected error occurred. Please try again or refresh the page.'}
          </p>
          {this.state.error && (
            <details className="mb-4 w-full max-w-lg">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
                Technical details
              </summary>
              <pre className="mt-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg overflow-x-auto text-left">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack && (
                  <>{'\n'}{this.state.errorInfo.componentStack}</>
                )}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <RefreshCw size={14} /> Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
