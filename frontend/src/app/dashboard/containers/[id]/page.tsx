'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ContainerDetailsPage() {
    const { id } = useParams() as { id: string };
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState<any>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when logs update
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        // Setup Logs WebSocket
        const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:8080/api';
        const logsWs = new WebSocket(`${wsUrl.replace('/api', '')}/ws/logs/${id}`);

        logsWs.onmessage = (event) => {
            // FileReader for blob if it's blob, depending on WS implementation. We sent raw text bytes.
            if (event.data instanceof Blob) {
                event.data.text().then(text => setLogs(prev => [...prev, text]));
            } else {
                setLogs(prev => [...prev, event.data]);
            }
        };

        // Setup Stats WebSocket
        const statsWs = new WebSocket(`${wsUrl.replace('/api', '')}/ws/stats/${id}`);
        statsWs.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    setStats(data);
                } catch (e) {
                    console.error('Failed to parse stats WebSocket data:', e);
                }
            }
        };

        return () => {
            logsWs.close();
            statsWs.close();
        };
    }, [id]);

    const calculateCpuPercent = (stats: any) => {
        if (!stats || !stats.cpu_stats || !stats.precpu_stats) return 0;
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const numCpus = stats.cpu_stats.online_cpus || 1;
        if (systemDelta > 0.0 && cpuDelta > 0.0) {
            return ((cpuDelta / systemDelta) * numCpus * 100).toFixed(2);
        }
        return '0.00';
    };

    const calculateMemPercent = (stats: any) => {
        if (!stats || !stats.memory_stats) return 0;
        const used = stats.memory_stats.usage;
        const limit = stats.memory_stats.limit;
        if (limit && limit > 0) {
            return ((used / limit) * 100).toFixed(2);
        }
        return '0.00';
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Container: {id.substring(0, 12)}</h2>

            <Tabs defaultValue="logs" className="w-full">
                <TabsList>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="stats">Live Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="mt-4">
                    <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm h-[600px] overflow-y-auto w-full break-all">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        <div ref={logsEndRef} />
                        {logs.length === 0 && <div className="text-gray-500 italic">Waiting for logs...</div>}
                    </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-4">
                    <div className="bg-white dark:bg-zinc-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800 grid grid-cols-2 gap-4">
                        <div className="border p-4 rounded-md">
                            <div className="text-sm text-gray-500">CPU Usage</div>
                            <div className="text-3xl font-bold">{calculateCpuPercent(stats)}%</div>
                        </div>
                        <div className="border p-4 rounded-md">
                            <div className="text-sm text-gray-500">Memory Usage</div>
                            <div className="text-3xl font-bold">{calculateMemPercent(stats)}%</div>
                            <div className="text-xs text-gray-400 mt-1">
                                {(stats?.memory_stats?.usage / 1024 / 1024).toFixed(2) || 0} MB /
                                {(stats?.memory_stats?.limit / 1024 / 1024).toFixed(2) || 0} MB
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
