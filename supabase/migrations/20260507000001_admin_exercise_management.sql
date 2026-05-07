-- Add is_admin flag to profiles (if not already present)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Allow admin users to insert system exercises (is_custom=false, created_by=null)
CREATE POLICY "exercises_admin_insert_system"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    is_custom = false
    AND created_by IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND is_admin = true
    )
  );
