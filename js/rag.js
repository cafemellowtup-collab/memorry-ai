// rag.js - Retrieval-Augmented Generation & Supabase Sync

// Global configuration
const SUPABASE_URL = 'https://oxjexjllnvoddqcepnbl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94amV4amxsbnZvZGRxY2VwbmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODIzMzMsImV4cCI6MjA5NjU1ODMzM30.4K6CXNVJnwvFNLrBpM_ed3AduOZQ0lmQJmNoy_MZRvI';

let supabaseClient = null;
let embedder = null;
let isModelLoaded = false;
let currentUserId = null;

// Initialize Supabase Client
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase initialized');
} else {
  console.error('❌ Supabase script not loaded');
}

// =====================
// AUTH FUNCTIONS
// =====================
async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function getCurrentUser() {
  const session = await getSession();
  if (session) {
    currentUserId = session.user.id;
    return session.user;
  }
  return null;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.replace('login.html');
}

// =====================
// EMBEDDING MODEL
// =====================
async function initEmbedder() {
  if (isModelLoaded) return;
  try {
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0');
    env.allowLocalModels = false;
    console.log('⏳ Downloading/Loading Xenova AI embedding model...');
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

async function generateEmbedding(text) {
  if (!isModelLoaded) await initEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// =====================
// CLOUD OPERATIONS (user-scoped)
// =====================

async function saveMemoryToRAG(text) {
  try {
    if (!currentUserId) { const u = await getCurrentUser(); if (!u) return; }
    console.log('Generating embedding for memory...');
    const vector = await generateEmbedding(text);
    console.log('Syncing memory to Supabase...');
    const { data, error } = await supabaseClient
      .from('memories')
      .insert([{ content: text, embedding: vector, user_id: currentUserId }]);
    if (error) throw error;
    console.log('✅ Memory saved to Supabase vectors!');
    return data;
  } catch (error) {
    console.error('❌ Failed to save memory to RAG:', error);
  }
}

async function searchMemories(query, limit = 3) {
  try {
    if (!currentUserId) { const u = await getCurrentUser(); if (!u) return []; }
    const queryVector = await generateEmbedding(query);
    const { data, error } = await supabaseClient.rpc('match_memories', {
      query_embedding: queryVector,
      match_threshold: 0.2,
      match_count: limit
    });
    if (error) throw error;
    // Filter to only this user's results
    return (data || []).filter(m => m.user_id === currentUserId);
  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    return [];
  }
}

async function fetchAllMemoriesFromCloud() {
  try {
    if (!currentUserId) { const u = await getCurrentUser(); if (!u) return []; }
    console.log('☁️ Fetching memories from Supabase...');
    const { data, error } = await supabaseClient
      .from('memories')
      .select('id, content, created_at, user_id')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch memories:', error);
    return [];
  }
}

// ==========================================
// DEDICATED JSON STATE SYNC (app_state table)
// ==========================================

async function pushJsonState(stateObj) {
  try {
    if (!currentUserId) { const u = await getCurrentUser(); if (!u) return; }
    
    const { error } = await supabaseClient.from('app_state').upsert({
      user_id: currentUserId,
      state: stateObj,
      updated_at: new Date().toISOString()
    });
    
    if (error) throw error;
    console.log('☁️ App State JSON safely pushed to Cloud!');
  } catch(e) {
    console.error('Failed to push JSON app state', e);
  }
}

async function fetchJsonState() {
  try {
    if (!currentUserId) { const u = await getCurrentUser(); if (!u) return null; }
    
    const { data, error } = await supabaseClient
      .from('app_state')
      .select('state')
      .eq('user_id', currentUserId)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows returned"
    return data ? data.state : null;
  } catch(e) {
    console.error('Failed to fetch JSON app state', e);
    return null;
  }
}

function subscribeToRealtime(onSyncRequired) {
  if (!currentUserId || !supabaseClient) return;
  
  supabaseClient
    .channel('public:app_state')
    .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'app_state', 
        filter: `user_id=eq.${currentUserId}` 
    }, payload => {
      console.log('⚡ Realtime JSON State Update Received!', payload);
      if (onSyncRequired) onSyncRequired();
    })
    .subscribe((status) => {
      console.log('📡 JSON WebSocket Status:', status);
    });
}

// Export everything to global scope
window.RAG = {
  supabaseClient,
  initEmbedder,
  generateEmbedding,
  saveMemoryToRAG,
  searchMemories,
  fetchAllMemoriesFromCloud,
  pushJsonState,
  fetchJsonState,
  subscribeToRealtime,
  getCurrentUser,
  signOut,
  get userId() { return currentUserId; }
};

// Start loading the model in the background immediately
window.addEventListener('DOMContentLoaded', () => {
  initEmbedder();
});
