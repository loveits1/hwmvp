-- Separate the calendar date on which homework is assigned from its completion deadline.
ALTER TABLE homeworks
    ADD COLUMN assigned_date date;

-- Existing homework was previously displayed by due date, so preserve that behavior during migration.
UPDATE homeworks
SET assigned_date = due_date
WHERE assigned_date IS NULL;

ALTER TABLE homeworks
    ALTER COLUMN assigned_date SET NOT NULL,
    ADD CONSTRAINT ck_homeworks_due_date_not_before_assigned
        CHECK (due_date >= assigned_date);

CREATE INDEX ix_homeworks_student_assigned_date_active
    ON homeworks (student_id, assigned_date, id) WHERE is_deleted = false;

COMMENT ON COLUMN homeworks.assigned_date IS '숙제가 배정되어 달력에 표시되는 선택일';
