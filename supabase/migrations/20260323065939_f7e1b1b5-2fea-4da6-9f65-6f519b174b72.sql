CREATE POLICY "Users can update gen_steps via job"
ON public.gen_steps
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gen_jobs
    WHERE gen_jobs.id = gen_steps.job_id
    AND gen_jobs.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gen_jobs
    WHERE gen_jobs.id = gen_steps.job_id
    AND gen_jobs.created_by = auth.uid()
  )
);