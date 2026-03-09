'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Box, Layers, HardDrive, Cpu, Activity, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">{label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
    );
}

export default function DashboardPage() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['system-stats'],
        queryFn: async () => {
            const res = await api.get('/system/stats');
            return res.data;
        },
        refetchInterval: 15000,
    });

    const { data: containers, isLoading: contLoading } = useQuery({
        queryKey: ['containers'],
        queryFn: async () => {
            const res = await api.get('/containers');
            return res.data;
        },
        refetchInterval: 10000,
    });

    const isLoading = statsLoading || contLoading;
    const memTotalGB = stats ? (stats.mem_total / 1024 / 1024 / 1024).toFixed(1) : '—';
    const recentContainers = containers?.slice(0, 8) || [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-white mb-1">Overview</h2>
                <p className="text-sm text-slate-500">Real-time Docker engine metrics</p>
            </div>

            {/* Stats Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse h-28" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={Box} label="Containers" color="bg-blue-500/20 text-blue-400"
                        value={stats?.containers || 0}
                        sub={`${stats?.containers_running || 0} running · ${stats?.containers_stopped || 0} stopped`}
                    />
                    <StatCard
                        icon={Layers} label="Images" color="bg-purple-500/20 text-purple-400"
                        value={stats?.images || 0}
                        sub="local images"
                    />
                    <StatCard
                        icon={Cpu} label="CPU Cores" color="bg-green-500/20 text-green-400"
                        value={stats?.ncpu || 0}
                        sub={stats?.arch}
                    />
                    <StatCard
                        icon={HardDrive} label="System RAM" color="bg-orange-500/20 text-orange-400"
                        value={`${memTotalGB} GB`}
                        sub={stats?.os}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Docker info */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <h3 className="font-semibold text-white text-sm">Docker Engine</h3>
                    </div>
                    {stats ? (
                        <div className="space-y-2.5 text-sm">
                            {[
                                ['Host', stats.name],
                                ['Docker Version', `v${stats.docker_version}`],
                                ['OS', stats.os],
                                ['Architecture', stats.arch],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-800 last:border-0">
                                    <span className="text-slate-400">{k}</span>
                                    <span className="text-slate-200 font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">{v}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Containers */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Box className="w-4 h-4 text-blue-400" />
                            <h3 className="font-semibold text-white text-sm">Recent Containers</h3>
                        </div>
                        <Link href="/dashboard/containers" className="text-xs text-blue-400 hover:text-blue-300 transition">
                            View all →
                        </Link>
                    </div>
                    {contLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-9 bg-slate-800 rounded animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {recentContainers.map((c: any) => (
                                <Link
                                    key={c.Id}
                                    href={`/dashboard/containers/${c.Id}`}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
                                >
                                    {c.State === 'running' ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                    ) : (
                                        <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    )}
                                    <span className="text-sm text-slate-300 group-hover:text-white truncate flex-1">
                                        {c.Names?.[0]?.replace('/', '') || c.Id.slice(0, 12)}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate max-w-[100px]">
                                        {c.Image?.split(':')[0]}
                                    </span>
                                </Link>
                            ))}
                            {recentContainers.length === 0 && (
                                <p className="text-center text-slate-500 text-sm py-6">No containers found</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
