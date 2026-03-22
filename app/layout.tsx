import { AppProvider } from '@/contexts/AppContext';
import { InferenceHistoryProvider } from '@/contexts/InferenceHistoryContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-bg text-text-primary">
        <div id="app-content">
          <AppProvider>
            <InferenceHistoryProvider>
              {children}
            </InferenceHistoryProvider>
          </AppProvider>
        </div>
      </body>
    </html>
  );
}