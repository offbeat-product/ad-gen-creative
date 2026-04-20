-- Make spot-inputs bucket public so n8n/Shotstack can fetch frame images and audio
UPDATE storage.buckets SET public = true WHERE id = 'spot-inputs';

-- Public read for spot-inputs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='spot_inputs_public_read') THEN
    CREATE POLICY "spot_inputs_public_read" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'spot-inputs');
  END IF;
END $$;

-- Authenticated users can upload
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='spot_inputs_authenticated_upload') THEN
    CREATE POLICY "spot_inputs_authenticated_upload" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'spot-inputs');
  END IF;
END $$;

-- Authenticated users can delete their own files
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='spot_inputs_authenticated_delete') THEN
    CREATE POLICY "spot_inputs_authenticated_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'spot-inputs');
  END IF;
END $$;