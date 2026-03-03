import { NextResponse } from 'next/server';

export async function GET(req: Request, context: { params: Promise<{ isbn: string }> }) {
    try {
        const { isbn } = await context.params;

        if (!isbn || isbn.length < 10) {
            return NextResponse.json({ message: 'Invalid ISBN provided.' }, { status: 400 });
        }

        const normalizedIsbn = isbn.replace(/[- ]/g, '');

        // 1. Try Open Library First (Free, no auth)
        const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${normalizedIsbn}&format=json&jscmd=data`);
        
        if (olRes.ok) {
            const data = await olRes.json();
            const bookData = data[`ISBN:${normalizedIsbn}`];

            if (bookData) {
                return NextResponse.json({
                    title: bookData.title || '',
                    author: bookData.authors?.[0]?.name || '',
                    publisher: bookData.publishers?.[0]?.name || '',
                    publishDate: bookData.publish_date || '',
                    description: (typeof bookData.notes === 'string' ? bookData.notes : bookData.notes?.value) || '',
                    coverUrl: bookData.cover?.large || bookData.cover?.medium || '',
                    source: 'openlibrary'
                });
            }
        }

        // 2. Fallback to Google Books API (Free tier, no auth required for public data)
        const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${normalizedIsbn}`);
        
        if (gbRes.ok) {
            const gbData = await gbRes.json();
            
            if (gbData.items && gbData.items.length > 0) {
                const vol = gbData.items[0].volumeInfo;
                
                // Google books uses http for covers which causes mixed content errors, force https
                const httpsCover = vol.imageLinks?.thumbnail?.replace('http:', 'https:') || 
                                   vol.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '';

                return NextResponse.json({
                    title: vol.title || '',
                    author: vol.authors?.[0] || '',
                    publisher: vol.publisher || '',
                    publishDate: vol.publishedDate || '',
                    description: vol.description || '',
                    coverUrl: httpsCover,
                    source: 'googlebooks'
                });
            }
        }

        // 3. Exhausted options
        return NextResponse.json({ message: 'Book not found in public databases.' }, { status: 404 });

    } catch (error) {
        console.error('ISBN Lookup Error:', error);
        return NextResponse.json({ message: 'Internal server error during ISBN lookup.' }, { status: 500 });
    }
}
