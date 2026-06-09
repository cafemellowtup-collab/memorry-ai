// rag.js - Retrieval-Augmented Generation & Supabase Sync

// Global configuration
const SUPABASE_URL = 'https://oxjexjllnvoddqcepnbl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94amV4amxsbnZvZGRxY2VwbmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODIzMzMsImV4cCI6MjA5NjU1ODMzM30.4K6CXNVJnwvFNLrBpM_ed3AduOZQ0lmQJmNoy_MZRvI';

let supabaseClient = null;
let embedder = null;
let isModelLoaded = false;

// Initialize Supabase Client
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase initialized');
} else {
  console.error('❌ Supabase script not loaded');
}

// Initialize Transformers.js
async function initEmbedder() {
  if (isModelLoaded) return;
  try {
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0');
    // Force Transformers.js to use the remote Hugging Face CDN instead of looking for local files
    env.allowLocalModels = false;
    
    console.log('⏳ Downloading/Loading Xenova AI embedding model...');
    // This will download the ~20MB model on first run and cache it in the browser
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (info) => {
        if (info.status === 'progress') {
          console.log(`Downloading ${info.file}: ${Math.round(info.progress)}%`);
        } else if (info.status === 'done') {
          console.log(`✅ Downloaded ${info.file}`);
        }
      }
    });
    isModelLoaded = true;
    console.log('✅ Local Embeddings Model loaded successfully!');
  } catch (error) {
    console.error('❌ Failed to load embedding model:', error);
  }
}

// Generate vector embedding for any text
async function generateEmbedding(text) {
  if (!isModelLoaded) await initEmbedder();
  
  // Create embedding
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  // Convert Float32Array to standard array
  return Array.from(output.data);
}

// Save a memory to Supabase with its vector embedding
async function saveMemoryToRAG(text) {
  try {
    console.log('Generating embedding for memory...');
    const vector = await generateEmbedding(text);
    
    console.log('Syncing memory to Supabase...');
    const { data, error } = await supabaseClient
      .from('memories')
      .insert([{ content: text, embedding: vector }]);

    if (error) throw error;
    console.log('✅ Memory saved to Supabase vectors!');
    return data;
  } catch (error) {
    console.error('❌ Failed to save memory to RAG:', error);
  }
}

// Perform Semantic Search against all saved memories
async function searchMemories(query, limit = 3) {
  try {
    const queryVector = await generateEmbedding(query);
    
    // Call the RPC function we created in Supabase
    const { data, error } = await supabaseClient.rpc('match_memories', {
      query_embedding: queryVector,
      match_threshold: 0.2, // Very low threshold so we always get some context
      match_count: limit
    });

    if (error) throw error;
    return data; // Returns array of { id, content, similarity }
  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    return [];
  }
}

// Fetch all memories from Supabase on app load
async function fetchAllMemoriesFromCloud() {
  try {
    console.log('☁️ Fetching memories from Supabase...');
    const { data, error } = await supabaseClient
      .from('memories')
      .select('id, content, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch memories:', error);
    return [];
  }
}

// Export functions to global scope so app.js can use them
window.RAG = {
  initEmbedder,
  generateEmbedding,
  saveMemoryToRAG,
  searchMemories,
  fetchAllMemoriesFromCloud
};

// Start loading the model in the background immediately
window.addEventListener('DOMContentLoaded', () => {
  initEmbedder();
});
