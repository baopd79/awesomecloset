-- Private bucket for all closet images (original, processed, thumbnail)
INSERT INTO storage.buckets (id, name, public)
VALUES ('closet-images', 'closet-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: user chỉ access folder của mình (path: {user_id}/...)
CREATE POLICY "closet-images: upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'closet-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "closet-images: read own folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'closet-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "closet-images: delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'closet-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
