'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { Trash2, Plus, RefreshCw, Network } from 'lucide-react';

export default function NetworksPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', driver: 'bridge', subnet: '' });

    const { data: networks, isLoading, refetch } = useQuery({
        queryKey: ['networks'],
        queryFn: async () => {
            const res = await api.get('/networks');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async () => api.post('/networks', form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['networks'] });
            setShowCreate(false);
            setForm({ name: '', driver: 'bridge', subnet: '' });
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/networks/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['networks'] }),
    });

    const systemNetworks = ['bridge', 'host', 'none'];

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Networks</h2>
                    <p className="text-sm text-slate-500">Manage Docker networks</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
                        <Plus className="w-4 h-4" /> Create Network
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Driver</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Scope</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Subnet</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Containers</th>
                            <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(6)].map((_, j) => (
                                        <td key={j} className="px-5 py-3"><div className="h-5 bg-slate-800 rounded animate-pulse" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : networks?.map((net: any) => (
                            <tr key={net.Id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Network className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        {net.Name}
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{net.Driver}</span>
                                </td>
                                <td className="px-5 py-3 text-slate-400 hidden md:table-cell">{net.Scope}</td>
                                <td className="px-5 py-3 text-slate-400 font-mono text-xs hidden lg:table-cell">
                                    {net.IPAM?.Config?.[0]?.Subnet || '—'}
                                </td>
                                <td className="px-5 py-3 text-slate-400 hidden lg:table-cell">
                                    {Object.keys(net.Containers || {}).length}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    {!systemNetworks.includes(net.Name) && (
                                        <button onClick={() => setConfirmRemove(net.Id)}
                                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition"
                                            title="Remove">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Dialog */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-white font-semibold mb-4">Create Network</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5">Name *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="my-network" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5">Driver</label>
                                <select value={form.driver} onChange={e => setForm(f => ({ ...f, driver: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                    <option value="bridge">bridge</option>
                                    <option value="overlay">overlay</option>
                                    <option value="macvlan">macvlan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5">Subnet (optional)</label>
                                <input value={form.subnet} onChange={e => setForm(f => ({ ...f, subnet: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="172.20.0.0/16" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-5">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">Cancel</button>
                            <button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}
                                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition">
                                {createMutation.isPending ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Remove */}
            {confirmRemove && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-white font-semibold mb-2">Remove Network?</h3>
                        <p className="text-slate-400 text-sm mb-5">Disconnect all containers first before removing.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmRemove(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">Cancel</button>
                            <button onClick={() => { removeMutation.mutate(confirmRemove); setConfirmRemove(null); }}
                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
