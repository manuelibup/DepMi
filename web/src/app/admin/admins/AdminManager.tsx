'use client';

import { useState } from 'react';
import styles from './AdminManager.module.css';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

type AdminUser = {
    id: string;
    displayName: string;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
    adminRole: AdminRole;
    createdAt: string;
    lastActiveAt: string | null;
};

export default function AdminManager({ initial, currentUserId }: { initial: AdminUser[]; currentUserId: string }) {
    const [admins, setAdmins] = useState(initial);
    const [query, setQuery] = useState('');
    const [newUserId, setNewUserId] = useState('');
    const [newRole, setNewRole] = useState<AdminRole>('MODERATOR');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function addAdmin() {
        if (!newUserId.trim()) return;
        setLoading(true); setError('');
        const res = await fetch('/api/admin/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: newUserId.trim(), role: newRole }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Failed'); }
        else {
            // Refresh list
            const listRes = await fetch('/api/admin/admins');
            const list = await listRes.json();
            setAdmins(list);
            setNewUserId('');
        }
        setLoading(false);
    }

    async function changeRole(id: string, role: AdminRole) {
        setLoading(true);
        await fetch(`/api/admin/admins/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        setAdmins(prev => prev.map(a => a.id === id ? { ...a, adminRole: role } : a));
        setLoading(false);
    }

    async function removeAdmin(id: string) {
        if (!confirm('Remove admin access for this user?')) return;
        setLoading(true);
        await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
        setAdmins(prev => prev.filter(a => a.id !== id));
        setLoading(false);
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.addCard}>
                <h2 className={styles.cardTitle}>Add Admin</h2>
                <p className={styles.hint}>Enter the user&apos;s ID (found on their profile page).</p>
                <div className={styles.addRow}>
                    <input
                        className={styles.input}
                        placeholder="User ID"
                        value={newUserId}
                        onChange={e => setNewUserId(e.target.value)}
                    />
                    <select className={styles.select} value={newRole} onChange={e => setNewRole(e.target.value as AdminRole)}>
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                    <button className={styles.addBtn} onClick={addAdmin} disabled={loading || !newUserId.trim()}>
                        {loading ? '…' : 'Add'}
                    </button>
                </div>
                {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.listCard}>
                <div className={styles.listHeader}>
                    <h2 className={styles.cardTitle}>Admin Team ({admins.length})</h2>
                    <input
                        className={styles.search}
                        placeholder="Filter…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr><th>User</th><th>Role</th><th>Last Active</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {admins
                            .filter(a => !query || a.displayName.toLowerCase().includes(query.toLowerCase()) || (a.email ?? '').includes(query))
                            .map(a => (
                                <tr key={a.id}>
                                    <td>
                                        <span className={styles.name}>{a.displayName}</span>
                                        <span className={styles.email}>{a.email}</span>
                                    </td>
                                    <td>
                                        {a.id === currentUserId
                                            ? <span className={styles.you}>{a.adminRole.replace('_', ' ')} (you)</span>
                                            : <select
                                                className={styles.roleSelect}
                                                value={a.adminRole}
                                                disabled={loading}
                                                onChange={e => changeRole(a.id, e.target.value as AdminRole)}>
                                                <option value="MODERATOR">Moderator</option>
                                                <option value="ADMIN">Admin</option>
                                                <option value="SUPER_ADMIN">Super Admin</option>
                                            </select>}
                                    </td>
                                    <td className={styles.muted}>{a.lastActiveAt ? new Date(a.lastActiveAt).toLocaleDateString() : '—'}</td>
                                    <td>
                                        {a.id !== currentUserId && (
                                            <button className={styles.removeBtn} onClick={() => removeAdmin(a.id)} disabled={loading}>
                                                Remove
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
