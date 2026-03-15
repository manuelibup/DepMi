'use client';

import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip,
} from 'recharts';
import styles from './Charts.module.css';

type Point = { date: string; dau: number };

export default function DauChart({ data }: { data: Point[] }) {
    const label = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>Daily Active Users (all time)</h3>
            </div>
            <div className={styles.scrollWrapper}>
                <div className={styles.scrollContent} style={{ minWidth: data.length > 7 ? `${data.length * 40}px` : '100%' }}>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" tickFormatter={label} tick={{ fontSize: 11, fill: '#666' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                labelFormatter={label}
                                formatter={(v: any) => [v, 'Active Users']}
                            />
                            <Bar dataKey="dau" fill="#0066FF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
