-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Create the documents table to store the Second Brain data
create table documents (
  id bigserial primary key,
  content text not null, -- The actual text content
  metadata jsonb, -- Optional JSON metadata (e.g. source, title, url)
  embedding vector(384) -- 384-dimensional vector for all-MiniLM-L6-v2
);

-- 3. Create a function to search for documents via similarity
create or replace function match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
