'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface PortRow { host: string; container: string; proto: string; }
interface VolumeRow { host: string; container: string; }
interface EnvRow { key: string; value: string; }

export default function CreateContainerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [image, setImage] = useState('');
    const [name, setName] = useState('');
    const [cmd, setCmd] = useState('');
    const [restartPolicy, setRestartPolicy] = useState('no');
    const [autoStart, setAutoStart] = useState(true);
    const [ports, setPorts] = useState<PortRow[]>([{ host: '', container: '', proto: 'tcp' }]);
    const [volumes, setVolumes] = useState<VolumeRow[]>([{ host: '', container: '' }]);
    const [envs, setEnvs] = useState<EnvRow[]>([{ key: '', value: '' }]);

    const updatePort = (i: number, field: keyof PortRow, val: string) =>
        setPorts(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const addPort = () => setPorts(p => [...p, { host: '', container: '', proto: 'tcp' }]);
    const removePort = (i: number) => setPorts(p => p.filter((_, idx) => idx !== i));

    const updateVolume = (i: number, field: keyof VolumeRow, val: string) =>
        setVolumes(v => v.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const addVolume = () => setVolumes(v => [...v, { host: '', container: '' }]);
    const removeVolume = (i: number) => setVolumes(v => v.filter((_, idx) => idx !== i));

    const updateEnv = (i: number, field: keyof EnvRow, val: string) =>
        setEnvs(e => e.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    const addEnv = () => setEnvs(e => [...e, { key: '', value: '' }]);
    const removeEnv = (i: number) => setEnvs(e => e.filter((_, idx) => idx !== i));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) { setError('Image is required'); return; }
        setLoading(true); setError('');
        try {
            await api.post('/containers', {
                image, name,
                cmd: cmd ? cmd.split(' ') : [],
                restart_policy: restartPolicy,
                auto_start: autoStart,
                ports: ports.filter(p => p.host && p.container),
                volumes: volumes.filter(v => v.host && v.container),
                env: envs.filter(e => e.key).map(e => `${e.key}=${e.value}`),
            });
            router.push('/dashboard/containers');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create container');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/containers" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h2 className="text-lg font-semibold text-white">Create Container</h2>
                    <p className="text-sm text-slate-500">Deploy a new container from an image</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic */}
                <Section title="Basic">
                    <FormGroup label="Image *">
                        <input value={image} onChange={e => setImage(e.target.value)} required
                            placeholder="nginx:latest" className={inputCls} />
                    </FormGroup>
                    <FormGroup label="Container Name">
                        <input value={name} onChange={e => setName(e.target.value)}
                            placeholder="my-container (leave empty for random)" className={inputCls} />
                    </FormGroup>
                    <FormGroup label="Command">
                        <input value={cmd} onChange={e => setCmd(e.target.value)}
                            placeholder="Override CMD, e.g. /bin/sh -c 'echo hello'" className={inputCls} />
                    </FormGroup>
                </Section>

                {/* Ports */}
                <Section title="Port Mappings">
                    {ports.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input value={p.host} onChange={e => updatePort(i, 'host', e.target.value)}
                                placeholder="Host port" className={`${inputCls} flex-1`} />
                            <span className="text-slate-500">:</span>
                            <input value={p.container} onChange={e => updatePort(i, 'container', e.target.value)}
                                placeholder="Container port" className={`${inputCls} flex-1`} />
                            <select value={p.proto} onChange={e => updatePort(i, 'proto', e.target.value)}
                                className="px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                            </select>
                            <button type="button" onClick={() => removePort(i)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addPort}
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition">
                        <Plus className="w-3.5 h-3.5" /> Add Port
                    </button>
                </Section>

                {/* Volumes */}
                <Section title="Volumes">
                    {volumes.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input value={v.host} onChange={e => updateVolume(i, 'host', e.target.value)}
                                placeholder="Host path / Volume name" className={`${inputCls} flex-1`} />
                            <span className="text-slate-500">→</span>
                            <input value={v.container} onChange={e => updateVolume(i, 'container', e.target.value)}
                                placeholder="Container path" className={`${inputCls} flex-1`} />
                            <button type="button" onClick={() => removeVolume(i)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addVolume}
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition">
                        <Plus className="w-3.5 h-3.5" /> Add Volume
                    </button>
                </Section>

                {/* Environment */}
                <Section title="Environment Variables">
                    {envs.map((e, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input value={e.key} onChange={ev => updateEnv(i, 'key', ev.target.value)}
                                placeholder="KEY" className={`${inputCls} w-40`} />
                            <span className="text-slate-500">=</span>
                            <input value={e.value} onChange={ev => updateEnv(i, 'value', ev.target.value)}
                                placeholder="VALUE" className={`${inputCls} flex-1`} />
                            <button type="button" onClick={() => removeEnv(i)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addEnv}
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition">
                        <Plus className="w-3.5 h-3.5" /> Add Variable
                    </button>
                </Section>

                {/* Config */}
                <Section title="Configuration">
                    <div className="grid grid-cols-2 gap-4">
                        <FormGroup label="Restart Policy">
                            <select value={restartPolicy} onChange={e => setRestartPolicy(e.target.value)}
                                className={inputCls}>
                                <option value="no">No</option>
                                <option value="always">Always</option>
                                <option value="unless-stopped">Unless Stopped</option>
                                <option value="on-failure">On Failure</option>
                            </select>
                        </FormGroup>
                        <FormGroup label="Auto Start">
                            <div className="flex items-center gap-3 h-[38px]">
                                <button type="button" onClick={() => setAutoStart(a => !a)}
                                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${autoStart ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoStart ? 'translate-x-4' : ''}`} />
                                </button>
                                <span className="text-sm text-slate-400">{autoStart ? 'Yes' : 'No'}</span>
                            </div>
                        </FormGroup>
                    </div>
                </Section>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <button type="submit" disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition flex items-center gap-2">
                        {loading ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deploying...</>
                        ) : 'Create Container'}
                    </button>
                    <Link href="/dashboard/containers"
                        className="px-6 py-2.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition font-medium text-sm flex items-center">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}

const inputCls = "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">{title}</h3>
            {children}
        </div>
    );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
            {children}
        </div>
    );
}
