-- =========================================================
-- PR detection fix: workout başına en fazla 1 PR kaydı olsun.
-- Aynı workout içindeki setler arası iyileşme PR sayılmaz;
-- sadece diğer workout'lardaki tüm zamanların en iyisini geçince PR oluşur.
-- =========================================================

CREATE OR REPLACE FUNCTION public.detect_pr_on_set()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id uuid;
  v_exercise_id uuid;
  v_workout_id uuid;
  v_workout_date date;
  v_new_1rm numeric;
  v_all_time_best numeric;
BEGIN
  -- Warmup set'leri atla
  IF NEW.is_warmup THEN RETURN NEW; END IF;

  -- Estimated 1RM hesapla
  v_new_1rm := NEW.weight * (1 + NEW.reps::numeric / 30);
  IF v_new_1rm IS NULL THEN RETURN NEW; END IF;

  -- İlişkili workout ve exercise bilgilerini al
  SELECT w.user_id, we.exercise_id, w.id, w.date
  INTO v_user_id, v_exercise_id, v_workout_id, v_workout_date
  FROM public.workout_exercises we
  JOIN public.workouts w ON we.workout_id = w.id
  WHERE we.id = NEW.workout_exercise_id;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  -- Tüm zamanların en iyisi — bu workout HARİÇ
  SELECT COALESCE(MAX(value), 0)
  INTO v_all_time_best
  FROM public.personal_records
  WHERE user_id = v_user_id
    AND exercise_id = v_exercise_id
    AND record_type = '1rm'
    AND workout_id IS DISTINCT FROM v_workout_id;

  -- Bu workout'un mevcut PR'ından da kontrol et
  -- (workout içindeki en iyi set zaten kayıtlıysa ve bu set onu geçmiyorsa çık)
  IF v_new_1rm <= v_all_time_best THEN
    -- Yine de bu workout'un kaydını güncelle (workout içi en iyi)
    UPDATE public.personal_records
    SET value = v_new_1rm, achieved_at = v_workout_date
    WHERE user_id = v_user_id
      AND exercise_id = v_exercise_id
      AND record_type = '1rm'
      AND workout_id = v_workout_id
      AND value < v_new_1rm;
    -- Güncelleme olmadıysa ve kayıt yoksa: hiçbir şey yapma (all-time best'i geçmedi)
    RETURN NEW;
  END IF;

  -- Tüm zamanların en iyisini geçti → bu workout'ta PR kaydı var mı?
  IF EXISTS (
    SELECT 1 FROM public.personal_records
    WHERE user_id = v_user_id
      AND exercise_id = v_exercise_id
      AND record_type = '1rm'
      AND workout_id = v_workout_id
  ) THEN
    -- Var → sadece daha iyiyse güncelle
    UPDATE public.personal_records
    SET value = v_new_1rm, achieved_at = v_workout_date
    WHERE user_id = v_user_id
      AND exercise_id = v_exercise_id
      AND record_type = '1rm'
      AND workout_id = v_workout_id
      AND value < v_new_1rm;
  ELSE
    -- Yok → yeni PR kaydı oluştur
    INSERT INTO public.personal_records
      (user_id, exercise_id, record_type, value, achieved_at, workout_id)
    VALUES
      (v_user_id, v_exercise_id, '1rm', v_new_1rm, v_workout_date, v_workout_id);
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================
-- Mevcut duplicate PR'ları temizle:
-- Her (user_id, exercise_id, workout_id) grubu için
-- en yüksek değerli PR dışındakileri sil.
-- =========================================================
DELETE FROM public.personal_records
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, exercise_id, workout_id) id
  FROM public.personal_records
  WHERE record_type = '1rm'
  ORDER BY user_id, exercise_id, workout_id, value DESC
);
