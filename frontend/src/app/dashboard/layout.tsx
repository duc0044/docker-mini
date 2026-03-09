'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, Box, Layers, LogOut,
    Server, ChevronRight, Container, Network, HardDrive, Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((state) => state.token);
    const role = useAuthStore((state) => state.role);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (mounted && !token) {
            router.push('/login');
        }
    }, [token, router, mounted]);

    const { data: stats } = useQuery({
        queryKey: ['system-stats'],
        queryFn: async () => {
            const res = await api.get('/system/stats');
            return res.data;
        },
        refetchInterval: 10000,
        enabled: !!token,
    });

    // Render cùng output (null) trên SSR và client cho đến khi mounted
    if (!mounted || !token) return null;

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Containers', href: '/dashboard/containers', icon: Box },
        { name: 'Images', href: '/dashboard/images', icon: Server },
        { name: 'Networks', href: '/dashboard/networks', icon: Network },
        { name: 'Volumes', href: '/dashboard/volumes', icon: HardDrive },
        { name: 'Stacks', href: '/dashboard/stacks', icon: Layers },
        { name: 'Events', href: '/dashboard/events', icon: Activity },
    ];

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(href + '/');

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100">
            {/* Sidebar */}
            <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                {/* Logo */}
                <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Container className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white text-sm tracking-wide">Docker Platform</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-0.5">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="flex-1">{item.name}</span>
                                {active && <ChevronRight className="w-3 h-3 opacity-70" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Stats mini */}
                {stats && (
                    <div className="mx-3 mb-3 p-3 bg-slate-800 rounded-lg text-xs text-slate-400 space-y-1.5">
                        <div className="flex justify-between">
                            <span>Containers</span>
                            <span className="text-slate-200 font-mono">{stats.containers_running}/{stats.containers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Images</span>
                            <span className="text-slate-200 font-mono">{stats.images}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Docker</span>
                            <span className="text-slate-200 font-mono">v{stats.docker_version}</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-3 border-t border-slate-800">
                    <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {role?.[0] || 'U'}
                        </div>
                        <span className="text-sm text-slate-300 flex-1 truncate capitalize">{role || 'user'}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0">
                    <nav className="flex items-center gap-1.5 text-sm">
                        {pathname.split('/').filter(Boolean).map((segment, i, arr) => (
                            <span key={i} className="flex items-center gap-1.5">
                                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                                <span className={i === arr.length - 1 ? 'text-slate-200 font-medium capitalize' : 'text-slate-500 capitalize'}>
                                    {segment}
                                </span>
                            </span>
                        ))}
                    </nav>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
