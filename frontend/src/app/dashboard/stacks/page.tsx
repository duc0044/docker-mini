'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState, useRef } from 'react';
import { Upload, Square, Trash2, RefreshCw, Layers } from 'lucide-react';

export default function StacksPage() {
    const queryClient = useQueryClient();
    const [stackName, setStackName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [deploying, setDeploying] = useState(false);
    const [deployResult, setDeployResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { data: stacks, isLoading, refetch } = useQuery({
        queryKey: ['stacks'],
        queryFn: async () => {
            const res = await api.get('/compose/stacks');
            return res.data;
        },
        refetchInterval: 10000,
    });

    const stopMutation = useMutation({
        mutationFn: async (name: string) => api.post(`/compose/stop/${name}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stacks'] }),
    });

    const removeMutation = useMutation({
        mutationFn: async (name: string) => api.delete(`/compose/stacks/${name}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stacks'] }),
    });

    const handleDeploy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stackName || !file) return;
        setDeploying(true);
        setDeployResult(null);

        const formData = new FormData();
        formData.append('name', stackName);
        formData.append('file', file);

        try {
            const res = await api.post('/compose/deploy', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setDeployResult({ ok: true, msg: res.data.output || 'Deployed successfully!' });
            setStackName('');
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            queryClient.invalidateQueries({ queryKey: ['stacks'] });
        } catch (err: any) {
            setDeployResult({ ok: false, msg: err.response?.data?.error || 'Deploy failed' });
        } finally {
            setDeploying(false);
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-white">Stacks</h2>
                <p className="text-sm text-slate-500">Deploy and manage Docker Compose stacks</p>
            </div>

            {/* Deploy form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-400" /> Deploy Stack
                </h3>
                <form onSubmit={handleDeploy} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Stack Name</label>
                            <input
                                type="text"
                                value={stackName}
                                onChange={(e) => setStackName(e.target.value)}
                                placeholder="e.g. my-app"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">docker-compose.yml</label>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".yml,.yaml"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer"
                                required
                            />
                        </div>
                    </div>

                    {deployResult && (
                        <div className={`text-xs rounded-lg px-4 py-3 font-mono whitespace-pre-wrap border ${deployResult.ok
                                ? 'bg-green-500/10 text-green-300 border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                            {deployResult.msg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={deploying || !stackName || !file}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                    >
                        {deploying ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Deploying...
                            </>
                        ) : (
                            <>
                                <Upload className="w-3.5 h-3.5" /> Deploy
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Stacks list */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400" /> Deployed Stacks
                    </h3>
                    <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : stacks?.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No stacks deployed yet</p>
                        <p className="text-xs mt-1">Upload a docker-compose.yml to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {stacks?.map((stack: any) => (
                            <div key={stack.name} className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors">
                                <div>
                                    <div className="font-medium text-slate-200">{stack.name}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{stack.compose_file}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => stopMutation.mutate(stack.name)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-yellow-400 border border-yellow-600/40 rounded-lg hover:bg-yellow-900/20 transition"
                                    >
                                        <Square className="w-3.5 h-3.5" /> Stop
                                    </button>
                                    <button
                                        onClick={() => setConfirmRemove(stack.name)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-600/40 rounded-lg hover:bg-red-900/20 transition"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirm dialog */}
            {confirmRemove && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-white font-semibold mb-2">Remove Stack "{confirmRemove}"?</h3>
                        <p className="text-slate-400 text-sm mb-5">The stack will be stopped and removed. Containers and volumes may be deleted.</p>
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
