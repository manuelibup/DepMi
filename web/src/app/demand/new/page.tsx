import React from 'react';
import DemandForm from './DemandForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Post a Request | DepMi',
    description: 'Post a product request to the DepMi Demand Engine.',
};

// Route is protected via middleware, so we don't need to auth guard it
export default function NewDemandPage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    const defaultQuery = searchParams.q || '';

    return (
        <main style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100dvh', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
            <DemandForm defaultQuery={defaultQuery} />
        </main>
    );
}
