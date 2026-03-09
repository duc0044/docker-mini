'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { Trash2, Download, Search, RefreshCw } from 'lucide-react';

function fmtBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function ImagesPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [pullImageName, setPullImageName] = useState('');
    const [isPulling, setIsPulling] = useState(false);
    const [pullError, setPullError] = useState('');
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    const { data: images, isLoading, refetch } = useQuery({
        queryKey: ['images'],
        queryFn: async () => {
            const res = await api.get('/images');
            return res.data;
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/images/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['images'] }),
    });

    const pullImage = async () => {
        if (!pullImageName) return;
        setIsPulling(true);
        setPullError('');
        try {
            await api.post('/images/pull', { image: pullImageName });
            queryClient.invalidateQueries({ queryKey: ['images'] });
            setPullImageName('');
        } catch (e: any) {
            setPullError(e.response?.data?.error || 'Failed to pull image');
        } finally {
            setIsPulling(false);
        }
    };

    const filtered = images?.filter((img: any) =>
        img.RepoTags?.[0]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        searchTerm === ''
    ) || [];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-white">Images</h2>
                <p className="text-sm text-slate-500">Manage local Docker images</p>
            </div>

            {/* Pull Image */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-400" /> Pull Image
                </h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="e.g. nginx:latest or ubuntu:22.04"
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={pullImageName}
                        onChange={(e) => setPullImageName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && pullImage()}
                    />
                    <button
                        onClick={pullImage}
                        disabled={isPulling || !pullImageName}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                    >
                        {isPulling ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Pulling...
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" />
                                Pull
                            </>
                        )}
                    </button>
                </div>
                {pullError && (
                    <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{pullError}</p>
                )}
            </div>

            {/* Image List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search images..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Repository:Tag</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Image ID</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Size</th>
                            <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(4)].map((_, j) => (
                                        <td key={j} className="px-5 py-3">
                                            <div className="h-5 bg-slate-800 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-12 text-slate-500">No images found</td>
                            </tr>
                        ) : (
                            filtered.map((img: any) => (
                                <tr key={img.Id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-5 py-3 font-mono text-sm text-slate-200">
                                        {img.RepoTags?.[0] || '<none>:<none>'}
                                    </td>
                                    <td className="px-5 py-3 hidden md:table-cell">
                                        <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                            {img.Id.substring(7, 19)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-400 text-sm">
                                        {fmtBytes(img.Size)}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => setConfirmRemove(img.Id)}
                                            className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Confirm Dialog */}
            {confirmRemove && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-white font-semibold mb-2">Remove Image?</h3>
                        <p className="text-slate-400 text-sm mb-5">This will delete the image from local storage.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmRemove(null)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    removeMutation.mutate(confirmRemove);
                                    setConfirmRemove(null);
                                }}
                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
