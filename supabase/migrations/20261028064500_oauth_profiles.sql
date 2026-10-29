-- Spec 11: perfiles para usuarios OAuth.

-- El trigger solo crea perfil si el registro trae username (email+contraseña).
-- Con OAuth (GitHub, Google) no llega: el perfil lo crea después claim_username().
-- create or replace conserva los privilegios revocados en la spec 06.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (id, username)
    values (new.id, new.raw_user_meta_data ->> 'username');
  end if;
  return new;
end;
$$;

-- Crea el perfil del usuario con sesión. Falla si ya tiene uno (PK),
-- si el nombre no cumple el check o si está cogido (unique).
-- security definer: profiles no concede insert a clientes; el id sale siempre
-- de auth.uid(), nunca de un argumento.
create function public.claim_username(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.profiles (id, username) values (auth.uid(), p_username);
end;
$$;

-- Solo usuarios con sesión pueden llamarla por la API.
revoke execute on function public.claim_username(text) from public, anon;
grant execute on function public.claim_username(text) to authenticated;
