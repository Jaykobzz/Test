/*
  Radera sitt konto.

  Apple kräver att en app som låter någon skapa ett konto också låter dem ta
  bort det, inifrån appen. GDPR kräver samma sak av andra skäl. Utan det här
  går appen inte igenom granskningen, oavsett hur bra resten är.

  Raderingen är verklig och inte en flagga. Ett konto som ligger kvar
  osynligt är inte raderat, det är gömt.
*/

-- ---------------------------------------------------------------------------
-- Två främmande nycklar som pekade åt fel håll för det här
-- ---------------------------------------------------------------------------

/*
  En anmälan ska överleva att den anmälde raderar sig.

  Med cascade kunde den som blivit anmäld radera sitt konto och därmed radera
  bevisen. Vem anmälan gällde går förlorad, men att den gjorts, av vem och
  varför står kvar, och det är det som gör att ett mönster går att se.
*/
alter table reports
  drop constraint reports_reported_user_id_fkey,
  add constraint reports_reported_user_id_fkey
    foreign key (reported_user_id) references profiles (id) on delete set null;

comment on column reports.reported_user_id is
  'null betyder att den anmälde raderat sitt konto. Anmälan står kvar.';

-- ---------------------------------------------------------------------------
-- Själva raderingen
-- ---------------------------------------------------------------------------

/*
  Värdens aktiviteter ställs in i stället för att försvinna.

  activities.host_id har cascade, så en rak radering skulle ta bort
  aktiviteterna och deras trådar utan ett ord. Någon som tackat ja till
  fisketuren på lördag skulle bara se den upplösas. Att ställa in dem först
  gör att deltagarna ser "inställd" och förstår vad som hänt.
*/
create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, extensions, auth, pg_temp
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Inte inloggad' using errcode = '28000';
  end if;

  update activities
     set status = 'cancelled',
         cancelled_reason = 'Värden har lämnat Haka på',
         updated_at = now()
   where host_id = v_me
     and status in ('open', 'full')
     and ends_at > now();

  -- Raderingen sker på auth-användaren. Allt annat hänger på den med
  -- cascade, så det är den enda punkt som behöver träffas.
  delete from auth.users where id = v_me;
end;
$$;

revoke execute on function delete_my_account() from public;
grant execute on function delete_my_account() to authenticated;
