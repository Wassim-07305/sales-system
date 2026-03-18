-- GenSpark — Presentation builder tables
-- 2026-03-19

-- ─── Presentations ──────────────────────────────────────────────────────────
create table if not exists presentations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Sans titre',
  description text,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'brand')),
  aspect_ratio text not null default '16:9' check (aspect_ratio in ('16:9', '4:3')),
  slide_count int not null default 0,
  is_template boolean not null default false,
  template_category text,
  generation_prompt text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_presentations_created_by on presentations(created_by);
create index idx_presentations_is_template on presentations(is_template) where is_template = true;

-- ─── Presentation Slides ────────────────────────────────────────────────────
create table if not exists presentation_slides (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  position int not null default 0,
  layout text not null default 'title' check (layout in (
    'title', 'title_content', 'bullets', 'two_columns',
    'image_left', 'image_right', 'image_full',
    'quote', 'chart', 'section', 'blank'
  )),
  content jsonb not null default '{}'::jsonb,
  notes text,
  transition text not null default 'fade' check (transition in ('fade', 'slide', 'zoom', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_presentation_slides_pres on presentation_slides(presentation_id, position);

-- ─── Presentation Shares ────────────────────────────────────────────────────
create table if not exists presentation_shares (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  shared_by uuid not null references auth.users(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  unique(presentation_id, shared_with)
);

create index idx_presentation_shares_with on presentation_shares(shared_with);

-- ─── Trigger: auto-update updated_at ────────────────────────────────────────
create or replace function update_presentations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_presentations_updated_at
  before update on presentations
  for each row execute function update_presentations_updated_at();

create trigger trg_presentation_slides_updated_at
  before update on presentation_slides
  for each row execute function update_presentations_updated_at();

-- ─── Trigger: auto-update slide_count ───────────────────────────────────────
create or replace function update_presentation_slide_count()
returns trigger as $$
begin
  if tg_op = 'DELETE' then
    update presentations
      set slide_count = (select count(*) from presentation_slides where presentation_id = old.presentation_id)
      where id = old.presentation_id;
    return old;
  else
    update presentations
      set slide_count = (select count(*) from presentation_slides where presentation_id = new.presentation_id)
      where id = new.presentation_id;
    return new;
  end if;
end;
$$ language plpgsql;

create trigger trg_slide_count_insert
  after insert on presentation_slides
  for each row execute function update_presentation_slide_count();

create trigger trg_slide_count_delete
  after delete on presentation_slides
  for each row execute function update_presentation_slide_count();

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table presentations enable row level security;
alter table presentation_slides enable row level security;
alter table presentation_shares enable row level security;

-- Presentations: owner full access
create policy "presentations_owner_select" on presentations
  for select using (created_by = auth.uid());
create policy "presentations_owner_insert" on presentations
  for insert with check (created_by = auth.uid());
create policy "presentations_owner_update" on presentations
  for update using (created_by = auth.uid());
create policy "presentations_owner_delete" on presentations
  for delete using (created_by = auth.uid());

-- Presentations: shared users can select
create policy "presentations_shared_select" on presentations
  for select using (
    id in (select presentation_id from presentation_shares where shared_with = auth.uid())
  );

-- Presentations: shared users with edit permission can update
create policy "presentations_shared_update" on presentations
  for update using (
    id in (select presentation_id from presentation_shares where shared_with = auth.uid() and permission = 'edit')
  );

-- Presentations: templates visible to all authenticated users
create policy "presentations_templates_select" on presentations
  for select using (is_template = true and auth.uid() is not null);

-- Slides: access if user owns or has access to the presentation
create policy "slides_owner_select" on presentation_slides
  for select using (
    presentation_id in (
      select id from presentations where created_by = auth.uid()
      union
      select presentation_id from presentation_shares where shared_with = auth.uid()
    )
  );
create policy "slides_owner_insert" on presentation_slides
  for insert with check (
    presentation_id in (select id from presentations where created_by = auth.uid())
    or presentation_id in (select presentation_id from presentation_shares where shared_with = auth.uid() and permission = 'edit')
  );
create policy "slides_owner_update" on presentation_slides
  for update using (
    presentation_id in (select id from presentations where created_by = auth.uid())
    or presentation_id in (select presentation_id from presentation_shares where shared_with = auth.uid() and permission = 'edit')
  );
create policy "slides_owner_delete" on presentation_slides
  for delete using (
    presentation_id in (select id from presentations where created_by = auth.uid())
  );

-- Slides: templates visible
create policy "slides_templates_select" on presentation_slides
  for select using (
    presentation_id in (select id from presentations where is_template = true and auth.uid() is not null)
  );

-- Shares: owner can manage
create policy "shares_owner_all" on presentation_shares
  for all using (shared_by = auth.uid());
-- Shares: shared_with can see their own shares
create policy "shares_recipient_select" on presentation_shares
  for select using (shared_with = auth.uid());
