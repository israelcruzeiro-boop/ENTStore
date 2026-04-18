-- Migration: Fix public accessibility for identifying company by slug
-- Corrects the 42501 (Permission Denied) error for anonymous users.

-- 1. Grant access to all identifying and branding columns for the landing page
GRANT SELECT (
  id,
  name,
  slug,
  link_name,
  theme,
  logo_url,
  hero_image,
  hero_title,
  hero_subtitle,
  hero_position,
  hero_brightness,
  public_bio,
  active,
  landing_page_enabled,
  landing_page_active,
  landing_page_layout,
  checklists_enabled,
  org_unit_name,
  org_top_level_name,
  org_levels
) ON TABLE public.companies TO anon;

-- Note: Sensitive fields like created_at, updated_at, deleted_at remain restricted.
