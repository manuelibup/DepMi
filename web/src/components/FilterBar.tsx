'use client';

import React, { useState } from 'react';
import styles from './FilterBar.module.css';

const FILTERS = ['For You', 'Demand Engine', 'Following', 'Fashion', 'Gadgets', 'Beauty', 'Food'];

interface FilterBarProps {
    onFilterChange?: (filter: string) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
    const [active, setActive] = useState('For You');

    const handleClick = (filter: string) => {
        setActive(filter);
        onFilterChange?.(filter);
    };

    return (
        <nav className={styles.wrapper}>
            <div className={styles.scroll}>
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        className={`${styles.chip} ${active === f ? styles.active : ''}`}
                        onClick={() => handleClick(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>
        </nav>
    );
}
