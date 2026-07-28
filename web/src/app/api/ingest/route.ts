import { NextRequest, NextResponse } from 'next/server';
import { addDocument } from '@/lib/rag-embeddings';

// Helper function to chunk text with overlap
function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks;
}

export async function POST(req: NextRequest) {
    try {
        const { filename, text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        // TODO: dedupe by content hash marker

        const chunks = chunkText(text, 500, 100);
        let successCount = 0;

        // Process chunks sequentially to respect memory limits
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const { error } = await addDocument(chunk, { 
                source: filename,
                chunk_index: i,
                total_chunks: chunks.length
            });
            if (!error) successCount++;
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully embedded ${successCount}/${chunks.length} chunks.`,
            chunksProcessed: successCount
        });

    } catch (error: any) {
        console.error("Ingestion Error:", error);
        return NextResponse.json({ error: error.message || "Failed to ingest file" }, { status: 500 });
    }
}
