-- Admin kullanıcılar sistem hareketlerini silebilir (is_custom=false, created_by=null)
CREATE POLICY "exercises_admin_delete_system"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    is_custom = false
    AND created_by IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND is_admin = true
    )
  );
