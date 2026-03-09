'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, Play, Square, RotateCw, Trash2, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type Tab = 'logs' | 'stats' | 'console' | 'inspect';

function StatusBadge({ state }: { state: string }) {
    const isRunning = state === 'running';
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isRunning ? 'bg-green-500/15 text-green-400 border border-green-500/30'
            : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            {state}
        </span>
    );
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────
function LogsTab({ containerId, containerState }: { containerId: string; containerState: string }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [filter, setFilter] = useState('');
    const [wsConnected, setWsConnected] = useState(false);
    const [mode, setMode] = useState<'live' | 'snapshot'>('snapshot');
    const logEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Snapshot logs via REST
    const fetchSnapshot = useCallback(async () => {
        try {
            const res = await api.get(`/containers/${containerId}/logs?tail=500`);
            setLogs(res.data.logs || []);
        } catch { /* ignore */ }
    }, [containerId]);

    // Live logs via WebSocket
    const connectWs = useCallback(() => {
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'}/ws/logs/${containerId}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => { setWsConnected(true); setLogs([]); };
        ws.onmessage = (e) => setLogs(prev => [...prev.slice(-1000), e.data]);
        ws.onclose = () => setWsConnected(false);
        ws.onerror = () => setWsConnected(false);
    }, [containerId]);

    useEffect(() => {
        if (mode === 'live') {
            connectWs();
        } else {
            wsRef.current?.close();
            setWsConnected(false);
            fetchSnapshot();
        }
        return () => wsRef.current?.close();
    }, [mode, connectWs, fetchSnapshot]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const filtered = filter ? logs.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : logs;

    const downloadLogs = () => {
        const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${containerId.slice(0, 12)}-logs.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
                    <button onClick={() => setMode('snapshot')}
                        className={`px-3 py-1.5 transition ${mode === 'snapshot' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}>
                        Snapshot
                    </button>
                    <button onClick={() => setMode('live')}
                        disabled={containerState !== 'running'}
                        className={`px-3 py-1.5 transition ${mode === 'live' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white disabled:opacity-40'}`}>
                        Live {wsConnected && <span className="ml-1 w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />}
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Filter logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex-1 min-w-[150px] max-w-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={fetchSnapshot} title="Refresh" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={downloadLogs} title="Download" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                    <Download className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-500">{filtered.length} lines</span>
            </div>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-auto font-mono text-xs text-green-300 min-h-0" style={{ minHeight: '400px' }}>
                {filtered.map((line, i) => (
                    <div key={i} className="leading-5 hover:bg-white/5 px-1 rounded whitespace-pre-wrap break-all">{line}</div>
                ))}
                {filtered.length === 0 && (
                    <p className="text-slate-500 text-center py-8">No logs available</p>
                )}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}

// ── Stats Tab ─────────────────────────────────────────────────────────────────
function StatsTab({ containerId, containerState }: { containerId: string; containerState: string }) {
    const [stats, setStats] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (containerState !== 'running') return;
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'}/ws/stats/${containerId}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onmessage = (e) => {
            try { setStats(JSON.parse(e.data)); } catch { /* ignore */ }
        };
        return () => ws.close();
    }, [containerId, containerState]);

    if (containerState !== 'running') {
        return <p className="text-slate-500 text-center py-12">Container is not running</p>;
    }

    const cpuPercent = stats ? calcCpu(stats) : 0;
    const memUsed = stats?.memory_stats?.usage || 0;
    const memTotal = stats?.memory_stats?.limit || 1;
    const memPercent = (memUsed / memTotal) * 100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard label="CPU Usage" percent={cpuPercent} color="blue" />
            <MetricCard label="Memory Usage" percent={memPercent}
                sub={`${fmtBytes(memUsed)} / ${fmtBytes(memTotal)}`} color="purple" />
            {stats && (
                <>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-full">
                        <h4 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Network I/O</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(stats.networks || {}).map(([name, net]: any) => (
                                <div key={name} className="space-y-1">
                                    <p className="text-xs text-slate-400 font-mono">{name}</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">↓ {fmtBytes(net.rx_bytes)}</span>
                                        <span className="text-slate-400">↑ {fmtBytes(net.tx_bytes)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
            {!stats && (
                <div className="col-span-full text-center py-12 text-slate-500">
                    Waiting for stats...
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, percent, sub, color }: { label: string; percent: number; sub?: string; color: string }) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
    };
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
                <h4 className="text-sm font-medium text-slate-300">{label}</h4>
                <span className="text-xl font-bold text-white">{percent.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorMap[color]} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
        </div>
    );
}

function calcCpu(stats: any): number {
    const cpuDelta = stats.cpu_stats?.cpu_usage?.total_usage - stats.precpu_stats?.cpu_usage?.total_usage;
    const sysDelta = stats.cpu_stats?.system_cpu_usage - stats.precpu_stats?.system_cpu_usage;
    const numCpus = stats.cpu_stats?.online_cpus || 1;
    if (!cpuDelta || !sysDelta) return 0;
    return (cpuDelta / sysDelta) * numCpus * 100;
}

function fmtBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ── Console Tab ──────────────────────────────────────────────────────────────────
function ConsoleTab({ containerId, containerState }: { containerId: string; containerState: string }) {
    const [output, setOutput] = useState<string>('');
    const [input, setInput] = useState<string>('');
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    const connect = useCallback(() => {
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'}/ws/exec/${containerId}?cmd=/bin/sh`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => { setConnected(true); setOutput(''); };
        ws.onmessage = (e) => {
            setOutput(prev => prev + e.data);
            setTimeout(() => { outputRef.current?.scrollTo(0, outputRef.current.scrollHeight); }, 50);
        };
        ws.onclose = () => { setConnected(false); setOutput(prev => prev + '\n[Connection closed]'); };
        ws.onerror = () => { setConnected(false); };
    }, [containerId]);

    useEffect(() => {
        return () => wsRef.current?.close();
    }, []);

    const sendCmd = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(input + '\n');
            setInput('');
        }
    };

    if (containerState !== 'running') {
        return <p className="text-slate-500 text-center py-12">Container is not running</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <button onClick={connect} disabled={connected}
                    className="px-4 py-1.5 text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg transition">
                    {connected ? '● Connected' : '▶ Connect'}
                </button>
                <button onClick={() => wsRef.current?.close()} disabled={!connected}
                    className="px-4 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition">
                    Disconnect
                </button>
                <button onClick={() => setOutput('')}
                    className="px-4 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">Clear</button>
            </div>
            <div ref={outputRef}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-green-300 overflow-auto whitespace-pre-wrap break-all"
                style={{ minHeight: '350px', maxHeight: '500px' }}>
                {output || <span className="text-slate-600">Click Connect then type commands below...</span>}
            </div>
            {connected && (
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                        <span className="text-green-400 font-mono text-sm">$</span>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendCmd()}
                            className="flex-1 bg-transparent text-sm text-slate-200 font-mono focus:outline-none"
                            placeholder="Type command..."
                            autoFocus
                        />
                    </div>
                    <button onClick={sendCmd}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                        Send
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContainerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const containerId = params.id as string;
    const [tab, setTab] = useState<Tab>('logs');

    const { data: container, isLoading, refetch } = useQuery({
        queryKey: ['container', containerId],
        queryFn: async () => {
            const res = await api.get(`/containers/${containerId}`);
            return res.data;
        },
        refetchInterval: 5000,
    });

    const handleAction = async (action: string) => {
        if (action === 'remove') {
            await api.delete(`/containers/${containerId}`);
            router.push('/dashboard/containers');
        } else {
            await api.post(`/containers/${containerId}/${action}`);
            refetch();
        }
    };

    const name = container?.Name?.replace('/', '') || containerId.slice(0, 12);
    const state = container?.State?.Status || 'unknown';

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/containers" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-white">{isLoading ? '...' : name}</h2>
                            {container && <StatusBadge state={state} />}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{containerId.slice(0, 12)}</div>
                    </div>
                </div>

                {!isLoading && container && (
                    <div className="flex items-center gap-2 shrink-0">
                        {state !== 'running' && (
                            <ActionButton onClick={() => handleAction('start')} icon={<Play className="w-4 h-4" />} label="Start" color="text-green-400 border-green-600/50 hover:bg-green-900/30" />
                        )}
                        {state === 'running' && (
                            <ActionButton onClick={() => handleAction('stop')} icon={<Square className="w-4 h-4" />} label="Stop" color="text-yellow-400 border-yellow-600/50 hover:bg-yellow-900/30" />
                        )}
                        <ActionButton onClick={() => handleAction('restart')} icon={<RotateCw className="w-4 h-4" />} label="Restart" color="text-blue-400 border-blue-600/50 hover:bg-blue-900/30" />
                        <ActionButton onClick={() => handleAction('remove')} icon={<Trash2 className="w-4 h-4" />} label="Remove" color="text-red-400 border-red-600/50 hover:bg-red-900/30" />
                    </div>
                )}
            </div>

            {/* Quick info */}
            {container && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        ['Image', container.Config?.Image || '—'],
                        ['Created', new Date(container.Created).toLocaleString()],
                        ['Restart Policy', container.HostConfig?.RestartPolicy?.Name || 'no'],
                        ['Platform', container.Platform || '—'],
                    ].map(([k, v]) => (
                        <div key={k} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                            <p className="text-xs text-slate-500 mb-1">{k}</p>
                            <p className="text-sm text-slate-200 font-mono truncate" title={v}>{v}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-slate-800">
                <div className="flex gap-0">
                    {(['logs', 'stats', 'console', 'inspect'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition capitalize ${tab === t
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div>
                {tab === 'logs' && <LogsTab containerId={containerId} containerState={state} />}
                {tab === 'stats' && <StatsTab containerId={containerId} containerState={state} />}
                {tab === 'console' && <ConsoleTab containerId={containerId} containerState={state} />}
                {tab === 'inspect' && (
                    <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-auto max-h-[600px] font-mono">
                        {JSON.stringify(container, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

function ActionButton({ onClick, icon, label, color }: { onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${color}`}
        >
            {icon}
            {label}
        </button>
    );
}
