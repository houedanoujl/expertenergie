-- Quiz expert énergie (CIPREL) : questions, tentatives et réponses.
-- À exécuter une fois dans l'éditeur SQL du projet Supabase, puis 0002_quiz_seed.sql.
-- Projet partagé avec « La centrale du futur » (table scores) : tout est préfixé quiz_.
--
-- Principes :
-- - RLS partout, aucune écriture directe : tout passe par les fonctions quiz_start,
--   quiz_answer et quiz_finish, qui valident côté base.
-- - Le corrigé (answer, explanation) n'est jamais lisible par l'API publique :
--   il n'est renvoyé qu'après une réponse (entraînement) ou en fin d'examen.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.quiz_quizzes (
  id        text primary key check (id ~ '^[a-z0-9-]{1,20}$'),
  label     text not null,
  title     text not null,
  subtitle  text not null default '',
  mode      text not null check (mode in ('entrainement', 'examen')),
  position  integer not null
);

create table if not exists public.quiz_questions (
  id           text primary key,
  quiz_id      text not null references public.quiz_quizzes (id) on delete cascade,
  position     integer not null,
  level        smallint check (level between 1 and 4),
  prompt       text not null,
  choices      jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) = 4),
  answer       char(1) not null check (answer in ('A', 'B', 'C', 'D')),
  explanation  text not null,
  calc         boolean not null default false,
  unique (quiz_id, position)
);

create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       text not null references public.quiz_quizzes (id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 20 and name !~ '[<>]'),
  token         uuid not null default gen_random_uuid(),
  question_ids  text[] not null check (cardinality(question_ids) between 1 and 50),
  ranked        boolean not null default true,
  total         integer not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  score         integer,
  duration_s    integer,
  level         text check (level in ('a-reprendre', 'acquis', 'expert')),
  share_slug    text unique
);

create index if not exists quiz_attempts_rank_idx
  on public.quiz_attempts (quiz_id, score desc, duration_s asc, finished_at asc)
  where finished_at is not null and ranked;

create table if not exists public.quiz_answers (
  attempt_id   uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id  text not null references public.quiz_questions (id) on delete cascade,
  choice       char(1) not null check (choice in ('A', 'B', 'C', 'D')),
  is_correct   boolean not null,
  time_ms      integer not null check (time_ms between 0 and 3600000),
  answered_at  timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- ─── Droits et RLS ───────────────────────────────────────────────────────────

alter table public.quiz_quizzes   enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts  enable row level security;
alter table public.quiz_answers   enable row level security;

revoke all on public.quiz_quizzes, public.quiz_questions, public.quiz_attempts, public.quiz_answers
  from anon, authenticated;

-- Quiz : lecture publique.
grant select on public.quiz_quizzes to anon, authenticated;
drop policy if exists "quiz lisibles par tous" on public.quiz_quizzes;
create policy "quiz lisibles par tous" on public.quiz_quizzes
  for select to anon, authenticated using (true);

-- Questions : lecture publique SANS le corrigé (droits par colonne).
grant select (id, quiz_id, position, level, prompt, choices, calc) on public.quiz_questions to anon, authenticated;
drop policy if exists "questions lisibles par tous" on public.quiz_questions;
create policy "questions lisibles par tous" on public.quiz_questions
  for select to anon, authenticated using (true);

-- Tentatives : classement public (parties terminées et classées), sans jeton ni identifiant.
grant select (quiz_id, name, ranked, total, finished_at, score, duration_s, level, share_slug)
  on public.quiz_attempts to anon, authenticated;
drop policy if exists "classement lisible par tous" on public.quiz_attempts;
create policy "classement lisible par tous" on public.quiz_attempts
  for select to anon, authenticated using (finished_at is not null and ranked);

-- Réponses : aucun accès direct.

-- ─── Fonctions ───────────────────────────────────────────────────────────────

-- Barème du document : 0–7 à reprendre, 8–11 acquis, 12–15 expert (sur 15),
-- appliqué au prorata pour les autres longueurs.
create or replace function public.quiz_level(p_score integer, p_total integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_score * 15 >= 12 * p_total then 'expert'
    when p_score * 15 >= 8 * p_total then 'acquis'
    else 'a-reprendre'
  end
$$;

-- Démarre une tentative. p_questions (facultatif) : sous-ensemble du quiz à réviser,
-- la tentative n'est alors pas classée.
create or replace function public.quiz_start(p_quiz text, p_name text, p_questions text[] default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_mode  text;
  v_ids   text[];
  v_id    uuid;
  v_token uuid;
begin
  if char_length(v_name) not between 2 and 20 or v_name ~ '[<>]' then
    raise exception 'Pseudo invalide (2 à 20 caractères).' using errcode = '22023';
  end if;

  select q.mode into v_mode from public.quiz_quizzes q where q.id = p_quiz;
  if v_mode is null then
    raise exception 'Quiz introuvable.' using errcode = '22023';
  end if;

  select array_agg(q.id order by q.position) into v_ids
  from public.quiz_questions q
  where q.quiz_id = p_quiz and (p_questions is null or q.id = any (p_questions));

  if v_ids is null
     or (p_questions is not null and cardinality(v_ids) <> (select count(distinct x) from unnest(p_questions) x)) then
    raise exception 'Questions invalides.' using errcode = '22023';
  end if;

  insert into public.quiz_attempts (quiz_id, name, question_ids, ranked, total)
  values (p_quiz, v_name, v_ids, p_questions is null, cardinality(v_ids))
  returning id, token into v_id, v_token;

  return json_build_object('attempt', v_id, 'token', v_token, 'mode', v_mode,
                           'questions', v_ids, 'ranked', p_questions is null);
end;
$$;

-- Enregistre une réponse. Entraînement et révision : renvoie la correction tout de suite.
-- Examen classé : la correction n'est donnée qu'à la fin (quiz_finish).
-- Idempotente : une deuxième réponse à la même question renvoie la première.
create or replace function public.quiz_answer(p_attempt uuid, p_token uuid, p_question text, p_choice text, p_time_ms integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.quiz_attempts%rowtype;
  v_mode    text;
  v_answer  char(1);
  v_expl    text;
  v_choice  char(1);
  v_correct boolean;
begin
  select a.* into v_attempt from public.quiz_attempts a where a.id = p_attempt and a.token = p_token;
  if not found then
    raise exception 'Tentative introuvable.' using errcode = '22023';
  end if;
  if v_attempt.finished_at is not null then
    raise exception 'Ce quiz est déjà terminé.' using errcode = '22023';
  end if;
  if not (p_question = any (v_attempt.question_ids)) then
    raise exception 'Question hors de ce quiz.' using errcode = '22023';
  end if;
  if upper(coalesce(p_choice, '')) not in ('A', 'B', 'C', 'D') then
    raise exception 'Réponse invalide.' using errcode = '22023';
  end if;

  select q.mode into v_mode from public.quiz_quizzes q where q.id = v_attempt.quiz_id;
  select q.answer, q.explanation into v_answer, v_expl from public.quiz_questions q where q.id = p_question;

  insert into public.quiz_answers (attempt_id, question_id, choice, is_correct, time_ms)
  values (p_attempt, p_question, upper(p_choice), upper(p_choice) = v_answer,
          least(greatest(coalesce(p_time_ms, 0), 0), 3600000))
  on conflict (attempt_id, question_id) do nothing;

  select r.choice, r.is_correct into v_choice, v_correct
  from public.quiz_answers r where r.attempt_id = p_attempt and r.question_id = p_question;

  if v_mode = 'examen' and v_attempt.ranked then
    return json_build_object('question', p_question, 'choice', v_choice, 'recorded', true);
  end if;
  return json_build_object('question', p_question, 'choice', v_choice, 'correct', v_correct,
                           'answer', v_answer, 'explanation', v_expl);
end;
$$;

-- Termine la tentative : score, niveau, rang, lien de partage et correction complète.
-- Idempotente : rappeler la fonction renvoie le même résultat.
create or replace function public.quiz_finish(p_attempt uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt  public.quiz_attempts%rowtype;
  v_answered integer;
  v_score    integer;
  v_ms       bigint;
  v_rank     integer;
  v_players  integer;
  v_corr     json;
begin
  select a.* into v_attempt from public.quiz_attempts a
  where a.id = p_attempt and a.token = p_token
  for update;
  if not found then
    raise exception 'Tentative introuvable.' using errcode = '22023';
  end if;

  if v_attempt.finished_at is null then
    select count(*), count(*) filter (where r.is_correct), coalesce(sum(r.time_ms), 0)
      into v_answered, v_score, v_ms
    from public.quiz_answers r where r.attempt_id = p_attempt;

    if v_answered < v_attempt.total then
      raise exception 'Il reste % question(s) sans réponse.', v_attempt.total - v_answered using errcode = '22023';
    end if;

    update public.quiz_attempts a
    set finished_at = now(),
        score       = v_score,
        duration_s  = greatest(1, round(v_ms / 1000.0)),
        level       = public.quiz_level(v_score, v_attempt.total),
        share_slug  = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
    where a.id = p_attempt
    returning a.* into v_attempt;
  end if;

  if v_attempt.ranked then
    select count(*) + 1 into v_rank
    from public.quiz_attempts s
    where s.quiz_id = v_attempt.quiz_id and s.ranked and s.finished_at is not null and s.id <> v_attempt.id
      and (s.score > v_attempt.score
        or (s.score = v_attempt.score and s.duration_s < v_attempt.duration_s)
        or (s.score = v_attempt.score and s.duration_s = v_attempt.duration_s and s.finished_at < v_attempt.finished_at));
    select count(*) into v_players
    from public.quiz_attempts s
    where s.quiz_id = v_attempt.quiz_id and s.ranked and s.finished_at is not null;
  end if;

  select json_agg(json_build_object(
           'question', q.id, 'position', q.position, 'choice', r.choice, 'correct', r.is_correct,
           'answer', q.answer, 'explanation', q.explanation) order by q.position)
    into v_corr
  from public.quiz_answers r
  join public.quiz_questions q on q.id = r.question_id
  where r.attempt_id = p_attempt;

  return json_build_object(
    'quiz', v_attempt.quiz_id, 'name', v_attempt.name,
    'score', v_attempt.score, 'total', v_attempt.total, 'level', v_attempt.level,
    'duration', v_attempt.duration_s, 'ranked', v_attempt.ranked,
    'rank', v_rank, 'players', v_players, 'slug', v_attempt.share_slug,
    'corrections', coalesce(v_corr, '[]'::json));
end;
$$;

-- Résultat public d'une tentative (page de partage) : pas de réponses, seulement juste/faux.
create or replace function public.quiz_result(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_attempt public.quiz_attempts%rowtype;
  v_quiz    public.quiz_quizzes%rowtype;
  v_rank    integer;
  v_players integer;
  v_pattern json;
begin
  select a.* into v_attempt from public.quiz_attempts a
  where a.share_slug = p_slug and a.finished_at is not null;
  if not found then
    return null;
  end if;
  select q.* into v_quiz from public.quiz_quizzes q where q.id = v_attempt.quiz_id;

  if v_attempt.ranked then
    select count(*) + 1 into v_rank
    from public.quiz_attempts s
    where s.quiz_id = v_attempt.quiz_id and s.ranked and s.finished_at is not null and s.id <> v_attempt.id
      and (s.score > v_attempt.score
        or (s.score = v_attempt.score and s.duration_s < v_attempt.duration_s)
        or (s.score = v_attempt.score and s.duration_s = v_attempt.duration_s and s.finished_at < v_attempt.finished_at));
    select count(*) into v_players
    from public.quiz_attempts s
    where s.quiz_id = v_attempt.quiz_id and s.ranked and s.finished_at is not null;
  end if;

  select json_agg(r.is_correct order by q.position) into v_pattern
  from public.quiz_answers r
  join public.quiz_questions q on q.id = r.question_id
  where r.attempt_id = v_attempt.id;

  return json_build_object(
    'slug', v_attempt.share_slug, 'name', v_attempt.name,
    'quiz', v_quiz.id, 'label', v_quiz.label, 'title', v_quiz.title, 'mode', v_quiz.mode,
    'score', v_attempt.score, 'total', v_attempt.total, 'level', v_attempt.level,
    'duration', v_attempt.duration_s, 'finished_at', v_attempt.finished_at,
    'ranked', v_attempt.ranked, 'rank', v_rank, 'players', v_players,
    'pattern', coalesce(v_pattern, '[]'::json));
end;
$$;

revoke all on function public.quiz_level(integer, integer) from public, anon, authenticated;
revoke all on function public.quiz_start(text, text, text[]) from public;
revoke all on function public.quiz_answer(uuid, uuid, text, text, integer) from public;
revoke all on function public.quiz_finish(uuid, uuid) from public;
revoke all on function public.quiz_result(text) from public;
grant execute on function public.quiz_start(text, text, text[]) to anon, authenticated;
grant execute on function public.quiz_answer(uuid, uuid, text, text, integer) to anon, authenticated;
grant execute on function public.quiz_finish(uuid, uuid) to anon, authenticated;
grant execute on function public.quiz_result(text) to anon, authenticated;

-- Rafraîchit le cache de l'API (tables et fonctions visibles tout de suite)
notify pgrst, 'reload schema';
