CREATE POLICY "Users can update gen_patterns via job"
ON public.gen_patterns
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM gen_jobs
    WHERE gen_jobs.id = gen_patterns.job_id
    AND gen_jobs.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gen_jobs
    WHERE gen_jobs.id = gen_patterns.job_id
    AND gen_jobs.created_by = auth.uid()
  )
);