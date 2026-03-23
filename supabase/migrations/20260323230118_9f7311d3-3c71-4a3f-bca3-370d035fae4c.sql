UPDATE gen_steps 
SET status = 'failed', 
    error_message = 'n8nワークフローでエラーが発生しました'
WHERE id = '6f7c5175-e70a-4dab-afd8-1df15bd619cd' 
  AND job_id = '7316cdb0-fef2-4165-851e-907f591b67de';