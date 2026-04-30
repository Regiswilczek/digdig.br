-- setup_supabase_storage.sql — cria bucket de avatars no Supabase Storage.
-- Roda uma vez no Supabase SQL Editor (ou via psql como service_role).
--
-- Por que SQL e não Alembic: o schema `storage.*` é gerenciado pelo Supabase
-- e não deve ser tocado por migrations da aplicação.

-- Bucket público para avatars (leitura pública, upload restrito por RLS)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, false,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: usuário só faz upload/update/delete do próprio avatar.
-- Convenção de path: avatars/{user_id}/avatar.{ext}
DROP POLICY IF EXISTS "Avatar leitura pública" ON storage.objects;
CREATE POLICY "Avatar leitura pública" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar upload owner" ON storage.objects;
CREATE POLICY "Avatar upload owner" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Avatar update owner" ON storage.objects;
CREATE POLICY "Avatar update owner" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Avatar delete owner" ON storage.objects;
CREATE POLICY "Avatar delete owner" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
