'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';

export default function ImagesPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [pullImageName, setPullImageName] = useState('');
    const [isPulling, setIsPulling] = useState(false);

    const { data: images, isLoading } = useQuery({
        queryKey: ['images'],
        queryFn: async () => {
            const res = await api.get('/images');
            return res.data;
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/images/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['images'] });
        },
    });

    const pullImage = async () => {
        if (!pullImageName) return;
        setIsPulling(true);
        try {
            await api.post('/images/pull', { image: pullImageName });
            queryClient.invalidateQueries({ queryKey: ['images'] });
            setPullImageName('');
        } catch (e) {
            console.error(e);
            alert('Failed to pull image');
        } finally {
            setIsPulling(false);
        }
    };

    if (isLoading) return <div>Loading images...</div>;

    const filteredImages = images?.filter((i: any) =>
        i.RepoTags?.[0]?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
                <h2 className="text-xl font-semibold mb-4">Pull Image</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="e.g., nginx:latest"
                        className="border rounded px-3 py-2 flex-1 dark:bg-zinc-900 dark:border-zinc-700"
                        value={pullImageName}
                        onChange={(e) => setPullImageName(e.target.value)}
                    />
                    <Button onClick={pullImage} disabled={isPulling}>
                        <Download className="mr-2 h-4 w-4" />
                        {isPulling ? 'Pulling...' : 'Pull Image'}
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Local Images</h2>
                    <input
                        type="text"
                        placeholder="Search images..."
                        className="border rounded px-3 py-1.5 min-w-[300px] text-sm dark:bg-zinc-900 dark:border-zinc-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Repository:Tag</TableHead>
                                <TableHead>Image ID</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredImages?.map((img: any) => (
                                <TableRow key={img.Id}>
                                    <TableCell className="font-medium">
                                        {img.RepoTags?.[0] || '<none>:<none>'}
                                    </TableCell>
                                    <TableCell className="text-gray-500 font-mono text-xs">
                                        {img.Id.substring(7, 19)}
                                    </TableCell>
                                    <TableCell>
                                        {(img.Size / 1024 / 1024).toFixed(2)} MB
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="icon" onClick={() => removeMutation.mutate(img.Id)}>
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredImages?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        No images found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
