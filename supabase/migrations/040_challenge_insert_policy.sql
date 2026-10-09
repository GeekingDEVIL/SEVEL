-- Allow authenticated users to insert challenges (for client-side challenge generation)
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (true);
