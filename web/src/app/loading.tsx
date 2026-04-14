import React from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

export default function Loading() {
    return (
        <main className={styles.main}>
            <Header />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
                 <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #FF8264 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulse 1.5s infinite ease-in-out'
                 }}>
                     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                         <line x1="3" y1="6" x2="21" y2="6" />
                         <path d="M16 10a4 4 0 0 1-8 0" />
                     </svg>
                 </div>
                 <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0% { opacity: 0.6; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.6; transform: scale(0.9); } }` }} />
            </div>
            <BottomNav />
        </main>
    );
}
