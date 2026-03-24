INSERT INTO gen_steps (job_id, step_number, step_key, step_label, status)
VALUES ('7316cdb0-fef2-4165-851e-907f591b67de', 9, 'ekonte', '絵コンテ作成', 'pending')
ON CONFLICT DO NOTHING;