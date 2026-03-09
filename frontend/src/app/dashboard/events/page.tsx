'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { RefreshCw, Activity } from 'lucide-react';

const typeColors: Record<string, string> = {
    container: 'text-blue-400',
    image: 'text-purple-400',
    network: 'text-green-400',
    volume: 'text-orange-400',
    daemon: 'text-slate-400',
};

const actionColors: Record<string, string> = {
    start: 'bg-green-500/15 text-green-400',
    stop: 'bg-yellow-500/15 text-yellow-400',
    kill: 'bg-red-500/15 text-red-400',
    die: 'bg-red-500/15 text-red-400',
    destroy: 'bg-red-500/15 text-red-400',
    create: 'bg-blue-500/15 text-blue-400',
    pull: 'bg-purple-500/15 text-purple-400',
    delete: 'bg-red-500/15 text-red-400',
    remove: 'bg-red-500/15 text-red-400',
};

export default function EventsPage() {
    const { data: events, isLoading, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const res = await api.get('/events');
            return res.data;
        },
        refetchInterval: 5000,
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Events</h2>
                    <p className="text-sm text-slate-500">Docker engine events – last hour</p>
                </div>
                <div className="flex items-center gap-3">
                    {dataUpdatedAt > 0 && (
                        <span className="text-xs text-slate-500">
                            Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
                        </span>
                    )}
                    <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(4)].map((_, j) => (
                                        <td key={j} className="px-5 py-3"><div className="h-5 bg-slate-800 rounded animate-pulse" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : events?.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-12 text-slate-500">
                                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    No events in the last hour
                                </td>
                            </tr>
                        ) : (
                            events?.map((evt: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-5 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                                        {new Date(evt.time * 1000).toLocaleTimeString()}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-medium ${typeColors[evt.Type] || 'text-slate-400'}`}>
                                            {evt.Type}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionColors[evt.Action] || 'bg-slate-700 text-slate-300'}`}>
                                            {evt.Action}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-300 font-mono text-xs truncate max-w-[200px]">
                                        {evt.Actor?.Attributes?.name || evt.Actor?.ID?.slice(0, 12) || '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
