import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. High scores will not be persisted.');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface HighScore {
  id: string;
  player_name: string;
  score: number;
  level: number;
  stars_collected: number;
  mode: 'story' | 'endless';
  created_at: string;
}

export async function ensureHighScoreTable(): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS high_scores (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        player_name VARCHAR(50) DEFAULT 'Anonymous',
        score INTEGER NOT NULL,
        level INTEGER DEFAULT 1,
        stars_collected INTEGER DEFAULT 0,
        mode VARCHAR(20) DEFAULT 'endless',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Allow public read" ON high_scores FOR SELECT USING (true);
      CREATE POLICY "Allow public insert" ON high_scores FOR INSERT WITH CHECK (true);
    `
  });

  if (error && !error.message.includes('already exists')) {
    console.error('Error ensuring high score table:', error);
  }
}

export async function submitHighScore(
  score: number,
  level: number,
  starsCollected: number,
  mode: 'story' | 'endless',
  playerName: string = 'Anonymous'
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, score not saved');
    return false;
  }

  const { error } = await supabase
    .from('high_scores')
    .insert({
      player_name: playerName,
      score,
      level,
      stars_collected: starsCollected,
      mode
    });

  if (error) {
    console.error('Error submitting high score:', error);
    return false;
  }

  return true;
}

export async function getHighScores(limit: number = 10): Promise<HighScore[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('high_scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching high scores:', error);
    return [];
  }

  return data || [];
}

export async function getHighScore(mode: 'story' | 'endless'): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from('high_scores')
    .select('score')
    .eq('mode', mode)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.score;
}
