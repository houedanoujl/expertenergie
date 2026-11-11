-- Quiz chronométrés (débutant, intermédiaire, expert) : 2 minutes par quiz, échec si le
-- temps est écoulé, points selon la justesse et le temps.
-- À exécuter après 0001_quiz.sql, puis rejouer 0002_quiz_seed.sql (les 3 nouveaux quiz).
-- Même logique que le stockage local de la borne (server/backends/local.js).

alter table public.quiz_quizzes  add column if not exists time_limit integer check (time_limit > 0);
alter table public.quiz_attempts add column if not exists points integer;
alter table public.quiz_attempts add column if not exists failed boolean not null default false;

-- Classement public : parties terminées, classées et réussies (les échecs n'y entrent pas).
grant select (points) on public.quiz_attempts to anon, authenticated;
drop policy if exists "classement lisible par tous" on public.quiz_attempts;
create policy "classement lisible par tous" on public.quiz_attempts
  for select to anon, authenticated using (finished_at is not null and ranked and not failed);

drop index if exists public.quiz_attempts_rank_idx;
create index quiz_attempts_rank_idx
  on public.quiz_attempts (quiz_id, points desc nulls last, score desc, duration_s asc, finished_at asc)
  where finished_at is not null and ranked and not failed;

-- 100 points par bonne réponse, plus 2 points par seconde restante, au prorata des bonnes réponses.
create or replace function public.quiz_points(p_score integer, p_total integer, p_left integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select p_score * 100 + round(2.0 * greatest(p_left, 0) * p_score / p_total)::integer
$$;

-- Rang d'une partie classée : points, puis bonnes réponses, durée, ancienneté.
create or replace function public.quiz_rank(p_attempt public.quiz_attempts)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer + 1
  from public.quiz_attempts s
  where s.quiz_id = p_attempt.quiz_id and s.ranked and not s.failed and s.finished_at is not null and s.id <> p_attempt.id
    and ((coalesce(s.points, 0), s.score, -s.duration_s) > (coalesce(p_attempt.points, 0), p_attempt.score, -p_attempt.duration_s)
      or ((coalesce(s.points, 0), s.score, s.duration_s) = (coalesce(p_attempt.points, 0), p_attempt.score, p_attempt.duration_s)
          and s.finished_at < p_attempt.finished_at))
$$;

-- Démarre une tentative. Une partie classée renvoie la durée du quiz (limit, en secondes) ;
-- une révision (p_questions) n'est ni classée ni chronométrée.
create or replace function public.quiz_start(p_quiz text, p_name text, p_questions text[] default null)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_mode  text;
  v_limit integer;
  v_ids   text[];
  v_id    uuid;
  v_token uuid;
begin
  if char_length(v_name) not between 2 and 20 or v_name ~ '[<>]' then
    raise exception 'Pseudo invalide (2 à 20 caractères).' using errcode = '22023';
  end if;

  select q.mode, q.time_limit into v_mode, v_limit from public.quiz_quizzes q where q.id = p_quiz;
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
                           'questions', v_ids, 'ranked', p_questions is null,
                           'limit', case when p_questions is null then v_limit end);
end;
$$;

-- Enregistre une réponse. Partie chronométrée : refusée une fois le temps écoulé
-- (3 secondes de marge pour le trajet de la requête).
create or replace function public.quiz_answer(p_attempt uuid, p_token uuid, p_question text, p_choice text, p_time_ms integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.quiz_attempts%rowtype;
  v_mode    text;
  v_limit   integer;
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

  select q.mode, q.time_limit into v_mode, v_limit from public.quiz_quizzes q where q.id = v_attempt.quiz_id;
  select q.answer, q.explanation into v_answer, v_expl from public.quiz_questions q where q.id = p_question;

  if v_attempt.ranked and v_limit is not null
     and now() > v_attempt.started_at + make_interval(secs => v_limit + 3)
     and not exists (select 1 from public.quiz_answers r where r.attempt_id = p_attempt and r.question_id = p_question) then
    raise exception 'Temps écoulé.' using errcode = '22023';
  end if;

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

-- Termine la tentative : score, points, niveau, rang, lien de partage et correction.
-- Partie chronométrée incomplète : échec (failed), 0 point, hors classement.
-- Idempotente : rappeler la fonction renvoie le même résultat.
create or replace function public.quiz_finish(p_attempt uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt  public.quiz_attempts%rowtype;
  v_limit    integer;
  v_answered integer;
  v_score    integer;
  v_ms       bigint;
  v_failed   boolean;
  v_duration integer;
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
  if v_attempt.ranked then
    select q.time_limit into v_limit from public.quiz_quizzes q where q.id = v_attempt.quiz_id;
  end if;

  select count(*), count(*) filter (where r.is_correct), coalesce(sum(r.time_ms), 0)
    into v_answered, v_score, v_ms
  from public.quiz_answers r where r.attempt_id = p_attempt;

  if v_attempt.finished_at is null then
    v_failed := v_limit is not null and v_answered < v_attempt.total;
    if v_answered < v_attempt.total and not v_failed then
      raise exception 'Il reste % question(s) sans réponse.', v_attempt.total - v_answered using errcode = '22023';
    end if;
    -- chronométré : temps écoulé depuis le départ ; révision : temps de réflexion cumulé
    if v_failed then
      v_duration := v_limit;
    elsif v_limit is not null then
      v_duration := greatest(1, least(v_limit, round(extract(epoch from now() - v_attempt.started_at))::integer));
    else
      v_duration := greatest(1, round(v_ms / 1000.0)::integer);
    end if;

    update public.quiz_attempts a
    set finished_at = now(),
        score       = v_score,
        duration_s  = v_duration,
        failed      = v_failed,
        points      = case when v_limit is null then null when v_failed then 0
                           else public.quiz_points(v_score, v_attempt.total, v_limit - v_duration) end,
        level       = public.quiz_level(v_score, v_attempt.total),
        share_slug  = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
    where a.id = p_attempt
    returning a.* into v_attempt;
  end if;

  if v_attempt.ranked and not v_attempt.failed then
    v_rank := public.quiz_rank(v_attempt);
    select count(*) into v_players
    from public.quiz_attempts s
    where s.quiz_id = v_attempt.quiz_id and s.ranked and not s.failed and s.finished_at is not null;
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
    'points', v_attempt.points, 'failed', v_attempt.failed, 'answered', v_answered, 'limit', v_limit,
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

  if v_attempt.ranked and not v_attempt.failed then
    v_rank := public.quiz_rank(v_attempt);
    select count(*) into v_players
    from public.quiz_attempts s
    where s.quiz_id = v_attempt.quiz_id and s.ranked and not s.failed and s.finished_at is not null;
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
    'points', v_attempt.points, 'failed', v_attempt.failed,
    'pattern', coalesce(v_pattern, '[]'::json));
end;
$$;

revoke all on function public.quiz_points(integer, integer, integer) from public, anon, authenticated;
revoke all on function public.quiz_rank(public.quiz_attempts) from public, anon, authenticated;

notify pgrst, 'reload schema';
