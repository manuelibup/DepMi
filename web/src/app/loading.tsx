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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulse 1.5s infinite ease-in-out'
                 }}>
                     <img src="/depmi-wordmark.svg" alt="DepMi" width={108} height={54} />
                 </div>
                 <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0% { opacity: 0.6; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.6; transform: scale(0.9); } }` }} />
            </div>
            <BottomNav />
        </main>
    );
}
