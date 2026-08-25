INSERT INTO common_codes (
    code, code_name, description, sort_order, hierarchy_level, parent_code_id
)
VALUES (
    'HW_PROGRESS_UPDATED',
    '진행률 변경',
    '숙제 진행률 변경 이력',
    25,
    2,
    (SELECT id FROM common_codes WHERE code = 'HW_ACTION')
)
ON CONFLICT DO NOTHING;
