-- Allow authenticated users to delete and update their uploaded audio files
CREATE POLICY "Authenticated users can delete audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audios');

CREATE POLICY "Authenticated users can update audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'audios');