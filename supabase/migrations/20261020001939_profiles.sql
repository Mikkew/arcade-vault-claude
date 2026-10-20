-- Spec 06: perfiles públicos ligados a auth.users.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (char_length(username) between 3 and 16 and username ~ '^[A-Za-z0-9_]+$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- lectura pública: el username se muestra en el leaderboard
create policy "profiles_select_public" on public.profiles
  for select to anon, authenticated using (true);

-- Sin política de insert/update/delete: el perfil lo crea solo el trigger.
-- Además se retiran los privilegios de escritura como defensa en profundidad.
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;

-- Crea el perfil al registrarse. El username llega en
-- signUp({ options: { data: { username } } }) y se valida con el check de la tabla;
-- si no es válido o ya existe, el insert falla y el registro se cancela.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

-- La función solo debe ejecutarla el trigger, no la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
