'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, Layers, HardDrive, Cpu } from 'lucide-react';

export default function DashboardPage() {
    const { data: systemInfo, isLoading: isSysLoading } = useQuery({
        queryKey: ['system', 'info'],
        queryFn: async () => {
            const res = await api.get('/system/info');
            return res.data;
        },
    });

    const { data: containers, isLoading: isContLoading } = useQuery({
        queryKey: ['containers'],
        queryFn: async () => {
            const res = await api.get('/containers');
            return res.data;
        },
    });

    if (isSysLoading || isContLoading) {
        return <div>Loading dashboard...</div>;
    }

    const runningContainers = containers?.filter((c: any) => c.State === 'running')?.length || 0;
    const memTotalGB = systemInfo ? (systemInfo.MemTotal / 1024 / 1024 / 1024).toFixed(2) : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Containers</CardTitle>
                        <Box className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemInfo?.Containers || 0}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {runningContainers} running
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Images</CardTitle>
                        <Layers className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemInfo?.Images || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">System CPU</CardTitle>
                        <Cpu className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemInfo?.NCPU || 0} Cores</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {systemInfo?.OperatingSystem}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">System RAM</CardTitle>
                        <HardDrive className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{memTotalGB} GB</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Docker Engine</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Version</span>
                                <span className="font-medium">{systemInfo?.ServerVersion}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Architecture</span>
                                <span className="font-medium">{systemInfo?.Architecture}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Host</span>
                                <span className="font-medium">{systemInfo?.Name}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
