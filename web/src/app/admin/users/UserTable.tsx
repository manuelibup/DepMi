'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './UserTable.module.css';

type User = {
    id: string;
    displayName: string;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
    depCount: number;
    depTier: string;
    kycTier: string;
    adminRole: string | null;
    isBanned: boolean;
    createdAt: string;
    lastActiveAt: string | null;
    _count: { followers: number; stores: number; ordersAsBuyer: number };
};

export default function UserTable({ initial, initialTotal }: { initial: User[]; initialTotal: number }) {
    const [q, setQ] = useState('');
    const [users, setUsers] = useState(initial);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const search = useCallback(async (query: string, pg: number) => {
        setLoading(true);
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${pg}`);
        const json = await res.json();
        setUsers(json.users);
        setTotal(json.total);
        setLoading(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => { setPage(1); search(q, 1); }, 300);
        return () => clearTimeout(t);
    }, [q, search]);

    async function toggleBan(userId: string, banned: boolean) {
        await fetch(`/api/admin/users/${userId}/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banned }),
        });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: banned } : u));
    }

    return (
        <div className={styles.wrap}>
            <input
                className={styles.search}
                placeholder="Search by name, email, or username..."
                value={q}
                onChange={e => setQ(e.target.value)}
            />
            <p className={styles.meta}>{total} users{loading ? ' — loading…' : ''}</p>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Dep Score</th>
                            <th>KYC</th>
                            <th>Followers</th>
                            <th>Orders</th>
                            <th>Joined</th>
                            <th>Last Active</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ opacity: loading ? 0.5 : 1 }}>
                        {users.map(u => (
                            <tr key={u.id} className={u.isBanned ? styles.banned : ''}>
                                <td>
                                    <Link href={`/admin/users/${u.id}`} className={styles.userCell}>
                                        <span className={styles.avatar}>
                                            {u.avatarUrl
                                                // eslint-disable-next-line @next/next/no-img-element
                                                ? <img src={u.avatarUrl} alt="" />
                                                : (u.displayName || '?').slice(0, 2).toUpperCase()}
                                        </span>
                                        <span>
                                            <span className={styles.name}>{u.displayName}</span>
                                            <span className={styles.handle}>@{u.username ?? '—'}</span>
                                        </span>
                                    </Link>
                                </td>
                                <td>{u.depCount}</td>
                                <td><span className={styles.tag}>{u.kycTier}</span></td>
                                <td>{u._count.followers}</td>
                                <td>{u._count.ordersAsBuyer}</td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td>{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : '—'}</td>
                                <td>
                                    {!u.adminRole && (
                                        <button
                                            className={`${styles.banBtn} ${u.isBanned ? styles.unban : styles.ban}`}
                                            onClick={() => toggleBan(u.id, !u.isBanned)}>
                                            {u.isBanned ? 'Unban' : 'Ban'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className={styles.pagination}>
                <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); search(q, p); }}>← Prev</button>
                <span>Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
                <button disabled={page >= Math.ceil(total / 20)} onClick={() => { const p = page + 1; setPage(p); search(q, p); }}>Next →</button>
            </div>
        </div>
    );
}
