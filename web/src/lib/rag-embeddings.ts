import { pipeline, env } from '@xenova/transformers';
import { createClient } from '@supabase/supabase-js';

// Skip local model checks, use CDN for serverless environment
env.allowLocalModels = false;

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
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string) {
  try {
    const embedder = await PipelineSingleton.getInstance();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error("Embedding Error:", error);
    return null;
  }
}

export async function addDocument(content: string, metadata: any = {}) {
  const embedding = await generateEmbedding(content);
  if (!embedding) return { error: "Failed to generate embedding" };

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
  const query_embedding = await generateEmbedding(query);
  if (!query_embedding) return { error: "Failed to generate embedding" };

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding,
    match_threshold,
    match_count
  });

  return { data, error };
}
