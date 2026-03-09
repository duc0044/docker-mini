'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { Play, Square, RotateCw, Trash2, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';

type FilterState = 'all' | 'running' | 'stopped';

function StatusBadge({ state }: { state: string }) {
    const isRunning = state === 'running';
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${isRunning ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-400' : 'bg-slate-500'}`} />
            {state}
        </span>
    );
}

export default function ContainersPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterState>('all');
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    const { data: containers, isLoading, refetch } = useQuery({
        queryKey: ['containers'],
        queryFn: async () => {
            const res = await api.get('/containers');
            return res.data;
        },
        refetchInterval: 8000,
    });

    const actionMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: string }) => {
            if (action === 'remove') return api.delete(`/containers/${id}`);
            return api.post(`/containers/${id}/${action}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['containers'] }),
    });

    const filtered = containers?.filter((c: any) => {
        const matchSearch =
            c.Names?.[0]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.Image?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter =
            filter === 'all' ||
            (filter === 'running' && c.State === 'running') ||
            (filter === 'stopped' && c.State !== 'running');
        return matchSearch && matchFilter;
    }) || [];

    const filterCounts = {
        all: containers?.length || 0,
        running: containers?.filter((c: any) => c.State === 'running').length || 0,
        stopped: containers?.filter((c: any) => c.State !== 'running').length || 0,
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Containers</h2>
                    <p className="text-sm text-slate-500">Manage your Docker containers</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or image..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                    {(['all', 'running', 'stopped'] as FilterState[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 text-xs font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">State</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Image</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Ports</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(5)].map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="h-5 bg-slate-800 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-500">
                                    No containers found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((c: any) => (
                                <tr key={c.Id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/dashboard/containers/${c.Id}`}
                                            className="font-medium text-slate-200 hover:text-blue-400 transition"
                                        >
                                            {c.Names?.[0]?.replace('/', '') || c.Id.slice(0, 12)}
                                        </Link>
                                        <div className="text-xs text-slate-500 font-mono">{c.Id.slice(0, 12)}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge state={c.State} />
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className="text-slate-400 text-xs font-mono truncate block max-w-[180px]" title={c.Image}>
                                            {c.Image}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">
                                        {c.Ports?.filter((p: any) => p.PublicPort).map((p: any, i: number) => (
                                            <div key={i}>{p.PublicPort}:{p.PrivatePort}</div>
                                        ))}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {c.State !== 'running' && (
                                                <ActionBtn
                                                    onClick={() => actionMutation.mutate({ id: c.Id, action: 'start' })}
                                                    title="Start"
                                                    icon={<Play className="w-3.5 h-3.5" />}
                                                    color="text-green-400 hover:bg-green-500/10"
                                                />
                                            )}
                                            {c.State === 'running' && (
                                                <ActionBtn
                                                    onClick={() => actionMutation.mutate({ id: c.Id, action: 'stop' })}
                                                    title="Stop"
                                                    icon={<Square className="w-3.5 h-3.5" />}
                                                    color="text-yellow-400 hover:bg-yellow-500/10"
                                                />
                                            )}
                                            <ActionBtn
                                                onClick={() => actionMutation.mutate({ id: c.Id, action: 'restart' })}
                                                title="Restart"
                                                icon={<RotateCw className="w-3.5 h-3.5" />}
                                                color="text-blue-400 hover:bg-blue-500/10"
                                            />
                                            <ActionBtn
                                                onClick={() => setConfirmRemove(c.Id)}
                                                title="Remove"
                                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                                color="text-red-400 hover:bg-red-500/10"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Confirm dialog */}
            {confirmRemove && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <h3 className="text-white font-semibold mb-2">Remove Container?</h3>
                        <p className="text-slate-400 text-sm mb-5">This action cannot be undone. The container will be force-removed.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmRemove(null)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    actionMutation.mutate({ id: confirmRemove, action: 'remove' });
                                    setConfirmRemove(null);
                                }}
                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActionBtn({ onClick, title, icon, color }: {
    onClick: () => void; title: string; icon: React.ReactNode; color: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded-md transition-colors ${color}`}
        >
            {icon}
        </button>
    );
}
