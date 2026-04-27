-- =========================================================
-- Sistem hareketleri (is_custom=false, created_by=null).
-- Türkçe isim 'name' kolonunda, İngilizce 'name_en'de.
-- primary_muscle vocabulary: chest, lats, mid_back, lower_back, traps,
--   front_delts, side_delts, rear_delts, biceps, triceps, forearms,
--   quads, hamstrings, glutes, calves, abs, obliques.
-- =========================================================

insert into public.exercises (name, name_en, primary_muscle, secondary_muscles, equipment, is_custom) values
-- ------- CHEST -------
('Bench Press', 'Bench Press', 'chest', array['front_delts','triceps'], 'barbell', false),
('Incline Bench Press', 'Incline Bench Press', 'chest', array['front_delts','triceps'], 'barbell', false),
('Decline Bench Press', 'Decline Bench Press', 'chest', array['triceps'], 'barbell', false),
('Dumbbell Bench Press', 'Dumbbell Bench Press', 'chest', array['front_delts','triceps'], 'dumbbell', false),
('Incline Dumbbell Press', 'Incline Dumbbell Press', 'chest', array['front_delts','triceps'], 'dumbbell', false),
('Dumbbell Fly', 'Dumbbell Fly', 'chest', array['front_delts'], 'dumbbell', false),
('Cable Fly', 'Cable Fly', 'chest', array['front_delts'], 'cable', false),
('Pec Deck', 'Pec Deck', 'chest', array['front_delts'], 'machine', false),
('Şınav', 'Push-up', 'chest', array['front_delts','triceps','abs'], 'bodyweight', false),
('Ağırlıklı Şınav', 'Weighted Push-up', 'chest', array['front_delts','triceps','abs'], 'bodyweight', false),
('Diamond Şınav', 'Diamond Push-up', 'triceps', array['chest','front_delts'], 'bodyweight', false),
('Dip', 'Dip', 'chest', array['triceps','front_delts'], 'bodyweight', false),
('Ağırlıklı Dip', 'Weighted Dip', 'chest', array['triceps','front_delts'], 'bodyweight', false),
('Asistanslı Dip', 'Assisted Dip', 'chest', array['triceps','front_delts'], 'machine', false),
('Smith Machine Bench Press', 'Smith Machine Bench Press', 'chest', array['front_delts','triceps'], 'smith_machine', false),

-- ------- BACK -------
('Deadlift', 'Deadlift', 'lower_back', array['glutes','hamstrings','traps','lats'], 'barbell', false),
('Romanian Deadlift', 'Romanian Deadlift', 'hamstrings', array['glutes','lower_back'], 'barbell', false),
('Sumo Deadlift', 'Sumo Deadlift', 'glutes', array['hamstrings','lower_back','traps'], 'barbell', false),
('Stiff-Legged Deadlift', 'Stiff-Legged Deadlift', 'hamstrings', array['glutes','lower_back'], 'barbell', false),
('Barfiks', 'Pull-up', 'lats', array['biceps','mid_back'], 'bodyweight', false),
('Ağırlıklı Barfiks', 'Weighted Pull-up', 'lats', array['biceps','mid_back'], 'bodyweight', false),
('Asistanslı Barfiks', 'Assisted Pull-up', 'lats', array['biceps','mid_back'], 'machine', false),
('Chin-up', 'Chin-up', 'lats', array['biceps'], 'bodyweight', false),
('Ağırlıklı Chin-up', 'Weighted Chin-up', 'lats', array['biceps'], 'bodyweight', false),
('Lat Pulldown', 'Lat Pulldown', 'lats', array['biceps','mid_back'], 'cable', false),
('Cable Row', 'Seated Cable Row', 'mid_back', array['lats','biceps','rear_delts'], 'cable', false),
('Bent-over Row', 'Bent-over Barbell Row', 'mid_back', array['lats','biceps','rear_delts'], 'barbell', false),
('Pendlay Row', 'Pendlay Row', 'mid_back', array['lats','biceps'], 'barbell', false),
('Dumbbell Row', 'Single-arm Dumbbell Row', 'lats', array['mid_back','biceps'], 'dumbbell', false),
('T-Bar Row', 'T-Bar Row', 'mid_back', array['lats','biceps'], 'machine', false),
('Face Pull', 'Face Pull', 'rear_delts', array['traps','mid_back'], 'cable', false),
('Barbell Shrug', 'Barbell Shrug', 'traps', array[]::text[], 'barbell', false),
('Dumbbell Shrug', 'Dumbbell Shrug', 'traps', array[]::text[], 'dumbbell', false),
('Hyperextension', 'Hyperextension', 'lower_back', array['glutes','hamstrings'], 'machine', false),
('Good Morning', 'Good Morning', 'lower_back', array['hamstrings','glutes'], 'barbell', false),

-- ------- SHOULDERS -------
('Overhead Press', 'Overhead Press', 'front_delts', array['triceps','side_delts'], 'barbell', false),
('Seated Dumbbell Press', 'Seated Dumbbell Shoulder Press', 'front_delts', array['triceps','side_delts'], 'dumbbell', false),
('Arnold Press', 'Arnold Press', 'front_delts', array['side_delts','triceps'], 'dumbbell', false),
('Lateral Raise', 'Dumbbell Lateral Raise', 'side_delts', array[]::text[], 'dumbbell', false),
('Cable Lateral Raise', 'Cable Lateral Raise', 'side_delts', array[]::text[], 'cable', false),
('Front Raise', 'Front Raise', 'front_delts', array[]::text[], 'dumbbell', false),
('Rear Delt Fly', 'Rear Delt Fly', 'rear_delts', array['mid_back'], 'dumbbell', false),
('Reverse Pec Deck', 'Reverse Pec Deck', 'rear_delts', array['mid_back'], 'machine', false),
('Upright Row', 'Upright Row', 'side_delts', array['traps','front_delts'], 'barbell', false),
('Smith Machine Shoulder Press', 'Smith Machine Shoulder Press', 'front_delts', array['triceps','side_delts'], 'smith_machine', false),

-- ------- BICEPS -------
('Barbell Curl', 'Barbell Curl', 'biceps', array['forearms'], 'barbell', false),
('Dumbbell Curl', 'Dumbbell Curl', 'biceps', array['forearms'], 'dumbbell', false),
('Hammer Curl', 'Hammer Curl', 'biceps', array['forearms'], 'dumbbell', false),
('Preacher Curl', 'Preacher Curl', 'biceps', array['forearms'], 'barbell', false),
('Cable Curl', 'Cable Curl', 'biceps', array['forearms'], 'cable', false),
('Concentration Curl', 'Concentration Curl', 'biceps', array[]::text[], 'dumbbell', false),
('Incline Dumbbell Curl', 'Incline Dumbbell Curl', 'biceps', array[]::text[], 'dumbbell', false),
('EZ-Bar Curl', 'EZ-Bar Curl', 'biceps', array['forearms'], 'barbell', false),

-- ------- TRICEPS -------
('Triceps Pushdown', 'Triceps Pushdown', 'triceps', array[]::text[], 'cable', false),
('Rope Pushdown', 'Rope Pushdown', 'triceps', array[]::text[], 'cable', false),
('Overhead Triceps Extension', 'Overhead Triceps Extension', 'triceps', array[]::text[], 'dumbbell', false),
('Skull Crusher', 'Lying Triceps Extension', 'triceps', array[]::text[], 'barbell', false),
('Close-Grip Bench Press', 'Close-Grip Bench Press', 'triceps', array['chest','front_delts'], 'barbell', false),
('Triceps Kickback', 'Triceps Kickback', 'triceps', array[]::text[], 'dumbbell', false),

-- ------- FOREARMS -------
('Wrist Curl', 'Wrist Curl', 'forearms', array[]::text[], 'barbell', false),
('Reverse Wrist Curl', 'Reverse Wrist Curl', 'forearms', array[]::text[], 'barbell', false),
('Farmers Walk', 'Farmers Walk', 'forearms', array['traps','abs'], 'dumbbell', false),

-- ------- QUADS -------
('Back Squat', 'Back Squat', 'quads', array['glutes','hamstrings','lower_back'], 'barbell', false),
('Front Squat', 'Front Squat', 'quads', array['glutes','abs'], 'barbell', false),
('Hack Squat', 'Hack Squat', 'quads', array['glutes'], 'machine', false),
('Leg Press', 'Leg Press', 'quads', array['glutes','hamstrings'], 'machine', false),
('Bulgarian Split Squat', 'Bulgarian Split Squat', 'quads', array['glutes','hamstrings'], 'dumbbell', false),
('Goblet Squat', 'Goblet Squat', 'quads', array['glutes'], 'dumbbell', false),
('Lunge', 'Lunge', 'quads', array['glutes','hamstrings'], 'dumbbell', false),
('Walking Lunge', 'Walking Lunge', 'quads', array['glutes','hamstrings'], 'dumbbell', false),
('Leg Extension', 'Leg Extension', 'quads', array[]::text[], 'machine', false),
('Smith Machine Squat', 'Smith Machine Squat', 'quads', array['glutes'], 'smith_machine', false),
('Sissy Squat', 'Sissy Squat', 'quads', array[]::text[], 'bodyweight', false),

-- ------- HAMSTRINGS -------
('Lying Leg Curl', 'Lying Leg Curl', 'hamstrings', array[]::text[], 'machine', false),
('Seated Leg Curl', 'Seated Leg Curl', 'hamstrings', array[]::text[], 'machine', false),
('Glute Ham Raise', 'Glute Ham Raise', 'hamstrings', array['glutes','lower_back'], 'bodyweight', false),

-- ------- GLUTES -------
('Hip Thrust', 'Hip Thrust', 'glutes', array['hamstrings'], 'barbell', false),
('Glute Bridge', 'Glute Bridge', 'glutes', array['hamstrings'], 'bodyweight', false),
('Cable Glute Kickback', 'Cable Glute Kickback', 'glutes', array['hamstrings'], 'cable', false),

-- ------- CALVES -------
('Standing Calf Raise', 'Standing Calf Raise', 'calves', array[]::text[], 'machine', false),
('Seated Calf Raise', 'Seated Calf Raise', 'calves', array[]::text[], 'machine', false),
('Donkey Calf Raise', 'Donkey Calf Raise', 'calves', array[]::text[], 'machine', false),
('Smith Machine Calf Raise', 'Smith Machine Calf Raise', 'calves', array[]::text[], 'smith_machine', false),

-- ------- ABS / CORE -------
('Plank', 'Plank', 'abs', array['obliques'], 'bodyweight', false),
('Cable Crunch', 'Cable Crunch', 'abs', array[]::text[], 'cable', false),
('Hanging Leg Raise', 'Hanging Leg Raise', 'abs', array['obliques'], 'bodyweight', false),
('Hanging Knee Raise', 'Hanging Knee Raise', 'abs', array['obliques'], 'bodyweight', false),
('Crunch', 'Crunch', 'abs', array[]::text[], 'bodyweight', false),
('Decline Sit-up', 'Decline Sit-up', 'abs', array[]::text[], 'bodyweight', false),
('Russian Twist', 'Russian Twist', 'obliques', array['abs'], 'bodyweight', false),
('Ab Wheel Rollout', 'Ab Wheel Rollout', 'abs', array['obliques','lower_back'], 'other', false),
('Side Plank', 'Side Plank', 'obliques', array['abs'], 'bodyweight', false),
('Cable Woodchop', 'Cable Woodchop', 'obliques', array['abs'], 'cable', false),
('Side Bend', 'Dumbbell Side Bend', 'obliques', array[]::text[], 'dumbbell', false);


-- =========================================================
-- Sistem split şablonları (user_id=null, is_template=true).
-- Her split için split_days satırları eklenir.
-- =========================================================

-- PPL (Push / Pull / Legs)
with s as (
  insert into public.splits (user_id, name, description, is_template, is_active)
  values (null, 'Push Pull Legs', 'Klasik 3-6 günlük PPL programı', true, false)
  returning id
)
insert into public.split_days (split_id, name, order_index, target_muscle_groups)
select id, name, order_index, target from s,
  (values
    ('Push Day', 1, array['chest','front_delts','side_delts','triceps']),
    ('Pull Day', 2, array['lats','mid_back','rear_delts','biceps']),
    ('Leg Day',  3, array['quads','hamstrings','glutes','calves'])
  ) as d(name, order_index, target);

-- Upper / Lower (4-day)
with s as (
  insert into public.splits (user_id, name, description, is_template, is_active)
  values (null, 'Upper / Lower', 'Üst gövde ve alt gövde günleri ayrı', true, false)
  returning id
)
insert into public.split_days (split_id, name, order_index, target_muscle_groups)
select id, name, order_index, target from s,
  (values
    ('Upper A', 1, array['chest','mid_back','lats','front_delts','biceps','triceps']),
    ('Lower A', 2, array['quads','hamstrings','glutes','calves']),
    ('Upper B', 3, array['chest','mid_back','lats','side_delts','biceps','triceps']),
    ('Lower B', 4, array['quads','hamstrings','glutes','calves'])
  ) as d(name, order_index, target);

-- Full Body 3-day
with s as (
  insert into public.splits (user_id, name, description, is_template, is_active)
  values (null, 'Full Body', 'Haftada 3 gün tüm vücut', true, false)
  returning id
)
insert into public.split_days (split_id, name, order_index, target_muscle_groups)
select id, name, order_index, target from s,
  (values
    ('Full Body A', 1, array['chest','lats','quads','front_delts','biceps','triceps','calves','abs']),
    ('Full Body B', 2, array['chest','mid_back','hamstrings','glutes','side_delts','biceps','triceps','abs']),
    ('Full Body C', 3, array['chest','lats','quads','rear_delts','biceps','triceps','calves','abs'])
  ) as d(name, order_index, target);

-- Bro Split (5-day)
with s as (
  insert into public.splits (user_id, name, description, is_template, is_active)
  values (null, 'Bro Split', '5 günlük klasik tek kas grubu split', true, false)
  returning id
)
insert into public.split_days (split_id, name, order_index, target_muscle_groups)
select id, name, order_index, target from s,
  (values
    ('Chest Day',    1, array['chest','triceps']),
    ('Back Day',     2, array['lats','mid_back','traps','lower_back']),
    ('Shoulder Day', 3, array['front_delts','side_delts','rear_delts','traps']),
    ('Arm Day',      4, array['biceps','triceps','forearms']),
    ('Leg Day',      5, array['quads','hamstrings','glutes','calves'])
  ) as d(name, order_index, target);

-- Arnold Split (6-day)
with s as (
  insert into public.splits (user_id, name, description, is_template, is_active)
  values (null, 'Arnold Split', '6 günlük yüksek hacim Arnold split', true, false)
  returning id
)
insert into public.split_days (split_id, name, order_index, target_muscle_groups)
select id, name, order_index, target from s,
  (values
    ('Chest & Back A',       1, array['chest','lats','mid_back']),
    ('Shoulders & Arms A',   2, array['front_delts','side_delts','rear_delts','biceps','triceps']),
    ('Legs A',               3, array['quads','hamstrings','glutes','calves']),
    ('Chest & Back B',       4, array['chest','lats','mid_back']),
    ('Shoulders & Arms B',   5, array['front_delts','side_delts','rear_delts','biceps','triceps']),
    ('Legs B',               6, array['quads','hamstrings','glutes','calves'])
  ) as d(name, order_index, target);
