'use client';

import { useState, useEffect } from 'react';

export function useScrollDirection() {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Show at the very top
            if (currentScrollY < 10) {
                setIsVisible(true);
            } 
            // Scrolling down -> Hide
            else if (currentScrollY > lastScrollY) {
                setIsVisible(false);
            } 
            // Scrolling up -> Show
            else {
                setIsVisible(true);
            }
            
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return isVisible;
}
