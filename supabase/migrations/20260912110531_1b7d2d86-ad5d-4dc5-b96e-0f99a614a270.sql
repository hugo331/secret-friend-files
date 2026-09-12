CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  clue_memory TEXT NOT NULL DEFAULT '',
  clue_job TEXT NOT NULL DEFAULT '',
  clue_passion TEXT NOT NULL DEFAULT '',
  clue_words TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.guesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guesser_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (guesser_id, target_id)
);

CREATE INDEX idx_guesses_guesser ON public.guesses(guesser_id);

GRANT ALL ON public.players TO service_role;
GRANT ALL ON public.guesses TO service_role;

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guesses ENABLE ROW LEVEL SECURITY;
