import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorMessage = error?.message || (error ? String(error) : 'Unknown error');
      console.error('ErrorBoundary caught an error:', errorMessage, {
        componentStack: errorInfo?.componentStack || 'N/A'
      });
    } catch (logError) {
      console.error('ErrorBoundary: Failed to log error:', logError);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ein Fehler ist aufgetreten</h1>
            <p className="text-gray-600 mb-2">
              Die Anwendung konnte nicht geladen werden. Bitte versuche es erneut.
            </p>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Tipp: Seite hart neu laden (Cache leeren). Auf dem iPhone: Safari → Adressleiste gedrückt halten → „Ohne Inhaltsblocker neu laden“ oder App schließen und erneut öffnen.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;





