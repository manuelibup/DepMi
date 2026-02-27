'use client';

import React from 'react';
import styles from './StoriesBar.module.css';

const VENDORS = [
    { name: 'KicksBySam', initial: 'K', color: '#6C5CE7' },
    { name: 'GadgetHub', initial: 'G', color: '#00B894' },
    { name: 'BellaStyles', initial: 'B', color: '#E17055' },
    { name: 'TechZone', initial: 'T', color: '#0984E3' },
    { name: 'FoodieNG', initial: 'F', color: '#FDCB6E' },
    { name: 'LuxHair', initial: 'L', color: '#A29BFE' },
    { name: 'PhonePro', initial: 'P', color: '#FF7675' },
];

export default function StoriesBar() {
    return (
        <div className={styles.wrapper}>
            <div className={styles.scroll}>
                {/* Your Story */}
                <div className={styles.storyItem}>
                    <div className={styles.addStory}>
                        <span className={styles.addIcon}>+</span>
                    </div>
                    <span className={styles.storyName}>Your Story</span>
                </div>
                {/* Vendor Stories */}
                {VENDORS.map((v) => (
                    <div key={v.name} className={styles.storyItem}>
                        <div className={styles.storyRing}>
                            <div className={styles.storyAvatar} style={{ background: v.color }}>
                                {v.initial}
                            </div>
                        </div>
                        <span className={styles.storyName}>{v.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
