'use client';

import { useState, useEffect } from 'react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip,
} from 'recharts';
import styles from './Charts.module.css';

type Point = { date: string; count: number };
type Period = 'day' | 'week' | 'month';

export default function SignupsChart({ initial }: { initial: Point[] }) {
    const [period, setPeriod] = useState<Period>('day');
    const [data, setData] = useState<Point[]>(initial);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (period === 'day') { setData(initial); return; }
        setLoading(true);
        fetch(`/api/admin/stats/signups?period=${period}`)
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [period, initial]);

    const label = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        if (period === 'month') return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Sign-ups</h3>
                <div className={styles.tabs}>
                    {(['day', 'week', 'month'] as Period[]).map(p => (
                        <button key={p} className={`${styles.tab} ${period === p ? styles.tabActive : ''}`}
                            onClick={() => setPeriod(p)}>
                            {p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : 'Monthly'}
                        </button>
                    ))}
                </div>
            </div>
            <div className={styles.scrollWrapper} style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                <div className={styles.scrollContent} style={{ minWidth: data.length > 7 ? `${data.length * 40}px` : '100%' }}>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" tickFormatter={label} tick={{ fontSize: 11, fill: '#666' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                labelFormatter={label}
                                formatter={(v: any) => [v, 'Sign-ups']}
                            />
                            <Line type="monotone" dataKey="count" stroke="#0066FF" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
