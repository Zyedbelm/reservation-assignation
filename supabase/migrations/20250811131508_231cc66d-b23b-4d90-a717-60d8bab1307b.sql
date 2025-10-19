-- Allow GMs to update their own game_masters row
create policy if not exists "GMs can update their own game master row"
on public.game_masters
for update
using (
  id in (
    select p.gm_id from public.profiles p
    where p.user_id = auth.uid() and p.role = 'gm'
  )
)
with check (
  id in (
    select p.gm_id from public.profiles p
    where p.user_id = auth.uid() and p.role = 'gm'
  )
);

-- Optional: ensure GMs can insert nothing (kept admin-only). No changes to other policies.
