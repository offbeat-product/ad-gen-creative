-- Delete duplicate styleframe step (keep the original one)
DELETE FROM gen_steps WHERE id = 'faf7c6b2-449c-4e9f-b9cc-8309f18679ce';

-- Update the remaining styleframe step to failed
UPDATE gen_steps 
SET status = 'failed', 
    error_message = 'n8nワークフローでエラーが発生しました'
WHERE id = '6f7c5175-e70a-4dab-afd8-1df15bd619cd';