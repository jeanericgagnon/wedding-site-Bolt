create or replace function public.vendor_profile_write(
  p_payload jsonb default '{}'::jsonb
)
returns public.vendor_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_slug text;
  v_attempt integer := 0;
  v_result public.vendor_profiles%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_slug := left(
      coalesce(nullif(btrim(coalesce(p_payload->>'slug', '')), ''), 'vendor-' || floor(extract(epoch from now()) * 1000)::bigint::text)
      || case when v_attempt = 1 then '' else '-' || (v_attempt + 1)::text end,
      72
    );

    begin
      insert into public.vendor_profiles (
        slug,
        vendor_name,
        descriptor,
        about,
        hero_image_url,
        image_urls,
        instagram_url,
        website_url,
        contact_email,
        source_payload,
        created_by
      )
      values (
        v_slug,
        coalesce(nullif(btrim(coalesce(p_payload->>'vendor_name', '')), ''), ''),
        nullif(btrim(coalesce(p_payload->>'descriptor', '')), ''),
        coalesce(nullif(btrim(coalesce(p_payload->>'about', '')), ''), ''),
        nullif(btrim(coalesce(p_payload->>'hero_image_url', '')), ''),
        coalesce(p_payload->'image_urls', '[]'::jsonb),
        nullif(btrim(coalesce(p_payload->>'instagram_url', '')), ''),
        nullif(btrim(coalesce(p_payload->>'website_url', '')), ''),
        nullif(btrim(coalesce(p_payload->>'contact_email', '')), ''),
        coalesce(p_payload->'source_payload', '{}'::jsonb),
        v_user_id
      )
      returning * into v_result;

      return v_result;
    exception
      when unique_violation then
        if v_attempt >= 8 then
          raise exception 'Could not find an available vendor page URL. Try a slightly different vendor name.';
        end if;
    end;
  end loop;
end;
$$;

grant execute on function public.vendor_profile_write(jsonb) to authenticated;
