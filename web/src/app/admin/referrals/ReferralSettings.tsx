'use client';

import { useState } from 'react';
import styles from './ReferralSettings.module.css';

type Config = {
    globalEnabled: boolean;
    rewardPercentage: number;
    durationDays: number;
};

type Code = {
    id: string;
    code: string;
    perUserEnabled: boolean;
    createdAt: string;
    user: { id: string; displayName: string; email: string | null; avatarUrl: string | null };
    _count: { referrals: number };
};

export default function ReferralSettings({
    initialConfig,
    initialCodes,
    isSuperAdmin,
}: {
    initialConfig: Config;
    initialCodes: Code[];
    isSuperAdmin: boolean;
}) {
    const [config, setConfig] = useState(initialConfig);
    const [codes, setCodes] = useState(initialCodes);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    async function saveConfig() {
        setSaving(true);
        const res = await fetch('/api/admin/referrals/config', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
        setSaving(false);
    }

    async function toggleCode(userId: string, perUserEnabled: boolean) {
        await fetch(`/api/admin/referrals/codes/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ perUserEnabled }),
        });
        setCodes(prev => prev.map(c => c.user.id === userId ? { ...c, perUserEnabled } : c));
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.configCard}>
                <h2 className={styles.cardTitle}>Referral Program Settings</h2>

                <div className={styles.field}>
                    <label className={styles.label}>Global Status</label>
                    <button
                        className={`${styles.toggle} ${config.globalEnabled ? styles.toggleOn : styles.toggleOff}`}
                        disabled={!isSuperAdmin}
                        onClick={() => setConfig(c => ({ ...c, globalEnabled: !c.globalEnabled }))}>
                        {config.globalEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>

                <div className={styles.fieldsRow}>
                    <div className={styles.field}>
                        <label className={styles.label}>Reward Percentage</label>
                        <div className={styles.inputWrap}>
                            <input
                                type="number" min={0} max={100} step={0.5}
                                className={styles.input}
                                value={config.rewardPercentage}
                                disabled={!isSuperAdmin}
                                onChange={e => setConfig(c => ({ ...c, rewardPercentage: Number(e.target.value) }))}
                            />
                            <span className={styles.inputSuffix}>% of first order</span>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Link Validity</label>
                        <div className={styles.inputWrap}>
                            <input
                                type="number" min={1} max={365}
                                className={styles.input}
                                value={config.durationDays}
                                disabled={!isSuperAdmin}
                                onChange={e => setConfig(c => ({ ...c, durationDays: Number(e.target.value) }))}
                            />
                            <span className={styles.inputSuffix}>days</span>
                        </div>
                    </div>
                </div>

                {isSuperAdmin && (
                    <button className={styles.saveBtn} onClick={saveConfig} disabled={saving}>
                        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
                    </button>
                )}
            </div>

            <div className={styles.codesCard}>
                <h2 className={styles.cardTitle}>Referral Codes ({codes.length})</h2>
                {codes.length === 0
                    ? <p className={styles.empty}>No referral codes generated yet.</p>
                    : <table className={styles.table}>
                        <thead>
                            <tr><th>User</th><th>Code</th><th>Referrals</th><th>Created</th>{isSuperAdmin && <th>Toggle</th>}</tr>
                        </thead>
                        <tbody>
                            {codes.map(c => (
                                <tr key={c.id} className={!c.perUserEnabled ? styles.disabled : ''}>
                                    <td>
                                        <span className={styles.userName}>{c.user.displayName}</span>
                                        <span className={styles.userEmail}>{c.user.email}</span>
                                    </td>
                                    <td><code className={styles.code}>{c.code}</code></td>
                                    <td>{c._count.referrals}</td>
                                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                                    {isSuperAdmin && (
                                        <td>
                                            <button
                                                className={`${styles.toggleSmall} ${c.perUserEnabled ? styles.toggleOn : styles.toggleOff}`}
                                                onClick={() => toggleCode(c.user.id, !c.perUserEnabled)}>
                                                {c.perUserEnabled ? 'On' : 'Off'}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>}
            </div>
        </div>
    );
}
