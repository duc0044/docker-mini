'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Devtools phải lazy-load với ssr:false để tránh hydration mismatch
const ReactQueryDevtools = dynamic(
    () => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 1000,
                refetchOnWindowFocus: true,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
