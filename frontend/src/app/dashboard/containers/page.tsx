'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCw, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ContainersPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: containers, isLoading } = useQuery({
        queryKey: ['containers'],
        queryFn: async () => {
            const res = await api.get('/containers');
            return res.data;
        },
    });

    const actionMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: string }) => {
            if (action === 'remove') {
                return api.delete(`/containers/${id}`);
            }
            return api.post(`/containers/${id}/${action}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
    });

    if (isLoading) return <div>Loading containers...</div>;

    const filteredContainers = containers?.filter((c: any) =>
        c.Names[0].toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.Image.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 bg-white dark:bg-zinc-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Containers</h2>
                <input
                    type="text"
                    placeholder="Search containers..."
                    className="border rounded px-3 py-1.5 min-w-[300px] text-sm dark:bg-zinc-900 dark:border-zinc-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>State</TableHead>
                            <TableHead>Image</TableHead>
                            <TableHead>Ports</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredContainers?.map((container: any) => (
                            <TableRow key={container.Id}>
                                <TableCell className="font-medium">
                                    <div className="flex border-b border-transparent items-center gap-2">
                                        <Link href={`/dashboard/containers/${container.Id}`} className="text-blue-600 hover:underline">
                                            {container.Names[0].replace('/', '')}
                                        </Link>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={container.State === 'running' ? 'default' : 'secondary'}
                                        className={container.State === 'running' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                        {container.State}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-gray-500 text-sm max-w-[200px] truncate" title={container.Image}>
                                    {container.Image}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {container.Ports?.map((p: any, i: number) => (
                                        p.PublicPort ? <div key={i}>{p.IP}:{p.PublicPort}-&gt;{p.PrivatePort}/{p.Type}</div> : null
                                    ))}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {container.State !== 'running' && (
                                            <Button variant="outline" size="icon" onClick={() => actionMutation.mutate({ id: container.Id, action: 'start' })}>
                                                <Play className="h-4 w-4 text-green-600" />
                                            </Button>
                                        )}
                                        {container.State === 'running' && (
                                            <Button variant="outline" size="icon" onClick={() => actionMutation.mutate({ id: container.Id, action: 'stop' })}>
                                                <Square className="h-4 w-4 text-yellow-600" />
                                            </Button>
                                        )}
                                        <Button variant="outline" size="icon" onClick={() => actionMutation.mutate({ id: container.Id, action: 'restart' })}>
                                            <RotateCw className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => actionMutation.mutate({ id: container.Id, action: 'remove' })}>
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredContainers?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No containers found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
