'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';

export default function StacksPage() {
    const [stackName, setStackName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [deploying, setDeploying] = useState(false);
    const [output, setOutput] = useState('');

    const handleDeploy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stackName || !file) return;

        setDeploying(true);
        setOutput('');

        const formData = new FormData();
        formData.append('name', stackName);
        formData.append('file', file);

        try {
            const res = await api.post('/compose/deploy', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setOutput(res.data.output || 'Stack deployed successfully');
        } catch (err: any) {
            setOutput(err.response?.data?.error || err.message);
        } finally {
            setDeploying(false);
        }
    };

    const handleStop = async () => {
        if (!stackName) return;
        setDeploying(true);
        try {
            const res = await api.post(`/compose/stop/${stackName}`);
            setOutput(res.data.output || 'Stack stopped');
        } catch (err: any) {
            setOutput(err.response?.data?.error || err.message);
        } finally {
            setDeploying(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Layers className="mr-2" />
                    Deploy Compose Stack
                </h2>
                <form onSubmit={handleDeploy} className="space-y-4 max-w-xl">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stack Name</label>
                        <input
                            type="text"
                            value={stackName}
                            onChange={(e) => setStackName(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">docker-compose.yml File</label>
                        <input
                            type="file"
                            accept=".yml,.yaml"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full px-3 py-2 mt-1 border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
                            required
                        />
                    </div>
                    <div className="flex gap-4">
                        <Button type="submit" disabled={deploying}>
                            {deploying ? 'Running...' : 'Deploy Stack'}
                        </Button>
                        <Button type="button" variant="destructive" disabled={deploying || !stackName} onClick={handleStop}>
                            Stop Stack
                        </Button>
                    </div>
                </form>
            </div>

            {output && (
                <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                    {output}
                </div>
            )}
        </div>
    );
}
