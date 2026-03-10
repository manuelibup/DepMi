import { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const ticking = useRef(false);

    useEffect(() => {
        const updateScrollDirection = () => {
            const currentScrollY = window.scrollY;

            // Avoid jitter by requiring more than 5px of scroll
            const diff = Math.abs(currentScrollY - lastScrollY.current);

            if (currentScrollY < 10) {
                setIsVisible(true);
            } else if (diff > 5) {
                if (currentScrollY > lastScrollY.current) {
                    setIsVisible(false);
                } else {
                    setIsVisible(true);
                }
            }

            lastScrollY.current = currentScrollY;
            ticking.current = false;
        };

        const onScroll = () => {
            if (!ticking.current) {
                window.requestAnimationFrame(updateScrollDirection);
                ticking.current = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return isVisible;
}
