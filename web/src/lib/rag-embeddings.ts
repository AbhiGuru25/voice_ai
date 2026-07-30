import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for bypassing RLS during indexing
// Fallback to anon key if service role is not provided (which will fail if RLS is strict)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

class PipelineSingleton {
  static task: any = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance(progress_callback: any = null) {
    if (this.instance === null) {
      // Dynamic import to prevent ONNX runtime from crashing Vercel Serverless load
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      env.cacheDir = '/tmp';
      if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
        env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
      }
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string) {
  try {
    const pipe = await PipelineSingleton.getInstance();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return { embedding: Array.from(output.data), error: null };
  } catch (error: any) {
    console.error("Embedding Error:", error);
    return { embedding: null, error: error.message || String(error) };
  }
}

export async function addDocument(content: string, metadata: any = {}) {
  const { embedding, error: embedError } = await generateEmbedding(content);
  if (!embedding) return { error: `Failed to generate embedding: ${embedError}` };

  const { data, error } = await supabase
    .from('documents')
    .insert({
      content,
      metadata,
      embedding
    })
    .select();

  return { data, error };
}

export async function searchDocuments(query: string, match_threshold = 0.5, match_count = 3) {
  const { embedding: query_embedding, error: embedError } = await generateEmbedding(query);
  if (!query_embedding) return { error: `Failed to generate embedding: ${embedError}` };

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding,
    match_threshold,
    match_count
  });

  return { data, error };
}
