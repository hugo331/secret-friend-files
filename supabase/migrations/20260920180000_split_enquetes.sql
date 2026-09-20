-- Sépare les tentatives par enquête (lycée / aujourd'hui) pour un même
-- suspect : calendrier différent, verrou indépendant, score indépendant.
-- Idempotent (peut être rejoué sans erreur).

ALTER TABLE public.guesses
  ADD COLUMN IF NOT EXISTS enquete TEXT NOT NULL DEFAULT 'lycee';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guesses_enquete_check'
  ) THEN
    ALTER TABLE public.guesses
      ADD CONSTRAINT guesses_enquete_check CHECK (enquete IN ('lycee', 'aujourdhui'));
  END IF;
END $$;

-- L'ancienne contrainte d'unicité (guesser_id, target_id) empêcherait de
-- jouer les deux enquêtes d'un même suspect : on la remplace par une
-- contrainte incluant `enquete`, quel que soit son nom auto-généré.
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.guesses'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) = 'UNIQUE (guesser_id, target_id)';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.guesses DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guesses_guesser_target_enquete_key'
  ) THEN
    ALTER TABLE public.guesses
      ADD CONSTRAINT guesses_guesser_target_enquete_key UNIQUE (guesser_id, target_id, enquete);
  END IF;
END $$;
