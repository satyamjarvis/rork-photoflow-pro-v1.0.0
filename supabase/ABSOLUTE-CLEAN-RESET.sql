-- ============================================
-- ABSOLUTE CLEAN DATABASE RESET & SETUP
-- Admin: David Hogan (dave0912@gmail.com / Access12345)
-- This includes ALL features: tables, storage, policies, triggers
-- ============================================

-- ============================================
-- STEP 1: Drop ALL storage policies first
-- ============================================

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

DROP POLICY IF EXISTS "media_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "media_images_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "media_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "media_images_admin_delete" ON storage.objects;

DROP POLICY IF EXISTS "media_videos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "media_videos_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "media_videos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "media_videos_admin_delete" ON storage.objects;

DROP POLICY IF EXISTS "portfolio_public_read" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_admin_delete" ON storage.objects;

DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete images" ON storage.objects;

DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;

DROP POLICY IF EXISTS "Public read access for portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete portfolio images" ON storage.objects;

-- ============================================
-- STEP 2: Delete all existing Dave users
-- ============================================

DELETE FROM public.profiles WHERE email = 'dave0912@gmail.com';
DELETE FROM auth.users WHERE email = 'dave0912@gmail.com';

-- ============================================
-- STEP 3: Drop all existing triggers
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.sessions;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_locations_updated_at ON public.locations;
DROP TRIGGER IF EXISTS update_media_items_updated_at ON public.media_items;

-- ============================================
-- STEP 4: Drop all existing functions
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_last_login() CASCADE;
DROP FUNCTION IF EXISTS public.log_admin_action(TEXT, TEXT, UUID, JSONB) CASCADE;

-- ============================================
-- STEP 5: Drop all existing tables
-- ============================================

DROP TABLE IF EXISTS public.media_items CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.licensing_inquiries CASCADE;
DROP TABLE IF EXISTS public.notification_devices CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.bts_videos CASCADE;
DROP TABLE IF EXISTS public.workshop_registrations CASCADE;
DROP TABLE IF EXISTS public.location_comments CASCADE;
DROP TABLE IF EXISTS public.workshops CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.portfolio CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- STEP 6: Clean storage buckets
-- ============================================

DELETE FROM storage.objects WHERE bucket_id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images');
DELETE FROM storage.buckets WHERE id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images');

-- ============================================
-- STEP 7: Create all tables
-- ============================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'moderator', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    is_subscriber BOOLEAN DEFAULT false,
    subscription_expires_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    hero_image_url TEXT,
    camera_settings JSONB,
    story_text TEXT,
    map_lat DOUBLE PRECISION,
    map_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    visible BOOLEAN DEFAULT true
);

CREATE TABLE public.location_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    hidden BOOLEAN DEFAULT false
);

CREATE TABLE public.workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ,
    price NUMERIC(10, 2),
    image_url TEXT,
    registration_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    visible BOOLEAN DEFAULT true
);

CREATE TABLE public.workshop_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workshop_id, user_id)
);

CREATE TABLE public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    visible BOOLEAN DEFAULT true
);

CREATE TABLE public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bts_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    subscriber_only BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    visible BOOLEAN DEFAULT true
);

CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INT CHECK (discount_percent > 0 AND discount_percent <= 100),
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(profile_id, push_token)
);

CREATE TABLE public.licensing_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed'))
);

CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- STEP 8: Create indexes
-- ============================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_locations_visible ON public.locations(visible);
CREATE INDEX idx_location_comments_location_id ON public.location_comments(location_id);
CREATE INDEX idx_location_comments_user_id ON public.location_comments(user_id);
CREATE INDEX idx_workshops_date ON public.workshops(date);
CREATE INDEX idx_workshops_visible ON public.workshops(visible);
CREATE INDEX idx_portfolio_order_index ON public.portfolio(order_index);
CREATE INDEX idx_portfolio_visible ON public.portfolio(visible);
CREATE INDEX idx_media_items_media_type ON public.media_items(media_type);
CREATE INDEX idx_media_items_created_at ON public.media_items(created_at DESC);
CREATE INDEX idx_bts_videos_visible ON public.bts_videos(visible);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_active ON public.coupons(active);

-- ============================================
-- STEP 9: Enable RLS on all tables
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bts_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 10: Create helper functions
-- ============================================

CREATE OR REPLACE FUNCTION public.check_is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = check_user_id 
        AND role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO postgres, anon, authenticated, service_role;

-- ============================================
-- STEP 11: RLS Policies - Profiles
-- ============================================

CREATE POLICY "profiles_insert_signup" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "profiles_delete_own" ON public.profiles
    FOR DELETE USING (id = auth.uid());

CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 12: RLS Policies - Audit Logs
-- ============================================

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 13: RLS Policies - Locations
-- ============================================

CREATE POLICY "locations_select_visible" ON public.locations
    FOR SELECT USING (visible = true);

CREATE POLICY "locations_select_admin" ON public.locations
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "locations_insert_admin" ON public.locations
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "locations_update_admin" ON public.locations
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "locations_delete_admin" ON public.locations
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 14: RLS Policies - Location Comments
-- ============================================

CREATE POLICY "location_comments_select_not_hidden" ON public.location_comments
    FOR SELECT USING (hidden = false);

CREATE POLICY "location_comments_select_admin" ON public.location_comments
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "location_comments_insert_auth" ON public.location_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "location_comments_update_own" ON public.location_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "location_comments_update_admin" ON public.location_comments
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "location_comments_delete_own" ON public.location_comments
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "location_comments_delete_admin" ON public.location_comments
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 15: RLS Policies - Workshops
-- ============================================

CREATE POLICY "workshops_select_visible" ON public.workshops
    FOR SELECT USING (visible = true);

CREATE POLICY "workshops_select_admin" ON public.workshops
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "workshops_insert_admin" ON public.workshops
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "workshops_update_admin" ON public.workshops
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "workshops_delete_admin" ON public.workshops
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 16: RLS Policies - Workshop Registrations
-- ============================================

CREATE POLICY "workshop_registrations_select_own" ON public.workshop_registrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workshop_registrations_select_admin" ON public.workshop_registrations
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "workshop_registrations_insert_auth" ON public.workshop_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workshop_registrations_delete_own" ON public.workshop_registrations
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STEP 17: RLS Policies - Portfolio
-- ============================================

CREATE POLICY "portfolio_select_visible" ON public.portfolio
    FOR SELECT USING (visible = true);

CREATE POLICY "portfolio_select_admin" ON public.portfolio
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_insert_admin" ON public.portfolio
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_update_admin" ON public.portfolio
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_delete_admin" ON public.portfolio
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 18: RLS Policies - Media Items
-- ============================================

CREATE POLICY "media_items_select_all" ON public.media_items
    FOR SELECT USING (true);

CREATE POLICY "media_items_insert_admin" ON public.media_items
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "media_items_update_admin" ON public.media_items
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "media_items_delete_admin" ON public.media_items
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 19: RLS Policies - BTS Videos
-- ============================================

CREATE POLICY "bts_videos_select_public" ON public.bts_videos
    FOR SELECT USING (
        visible = true AND (
            NOT subscriber_only OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_subscriber = true)
        )
    );

CREATE POLICY "bts_videos_select_admin" ON public.bts_videos
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "bts_videos_insert_admin" ON public.bts_videos
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "bts_videos_update_admin" ON public.bts_videos
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "bts_videos_delete_admin" ON public.bts_videos
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 20: RLS Policies - Coupons
-- ============================================

CREATE POLICY "coupons_select_active" ON public.coupons
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        active = true AND
        (expires_at IS NULL OR expires_at > now())
    );

CREATE POLICY "coupons_select_admin" ON public.coupons
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "coupons_insert_admin" ON public.coupons
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "coupons_update_admin" ON public.coupons
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "coupons_delete_admin" ON public.coupons
    FOR DELETE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 21: RLS Policies - Notification Devices
-- ============================================

CREATE POLICY "notification_devices_select_own" ON public.notification_devices
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "notification_devices_select_admin" ON public.notification_devices
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "notification_devices_insert_own" ON public.notification_devices
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "notification_devices_delete_own" ON public.notification_devices
    FOR DELETE USING (auth.uid() = profile_id);

-- ============================================
-- STEP 22: RLS Policies - Licensing Inquiries
-- ============================================

CREATE POLICY "licensing_inquiries_select_own" ON public.licensing_inquiries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "licensing_inquiries_select_admin" ON public.licensing_inquiries
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "licensing_inquiries_insert_auth" ON public.licensing_inquiries
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "licensing_inquiries_update_admin" ON public.licensing_inquiries
    FOR UPDATE USING (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 23: RLS Policies - Password Reset Tokens
-- ============================================

CREATE POLICY "password_reset_tokens_insert_system" ON public.password_reset_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "password_reset_tokens_update_system" ON public.password_reset_tokens
    FOR UPDATE USING (true);

-- ============================================
-- STEP 24: Create triggers and handler functions
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_items_updated_at BEFORE UPDATE ON public.media_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO user_count FROM public.profiles;
    
    INSERT INTO public.profiles (
        id, 
        email, 
        role, 
        status, 
        onboarding_completed, 
        last_login
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.phone, 'user-' || NEW.id::text),
        CASE WHEN user_count = 0 THEN 'admin' ELSE 'viewer' END,
        'active',
        false,
        now()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
    WHEN others THEN
        RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET last_login = now()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_last_login() TO postgres, anon, authenticated, service_role;

CREATE TRIGGER on_auth_user_login
    AFTER INSERT ON auth.sessions
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_last_login();

CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_table_name TEXT,
    p_action TEXT,
    p_row_id UUID,
    p_payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (auth.uid(), p_action, jsonb_build_object(
        'table', p_table_name,
        'row_id', p_row_id,
        'payload', p_payload
    ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB) TO postgres, anon, authenticated, service_role;

-- ============================================
-- STEP 25: Grant permissions
-- ============================================

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.locations TO service_role;
GRANT ALL ON public.location_comments TO service_role;
GRANT ALL ON public.workshops TO service_role;
GRANT ALL ON public.workshop_registrations TO service_role;
GRANT ALL ON public.portfolio TO service_role;
GRANT ALL ON public.media_items TO service_role;
GRANT ALL ON public.bts_videos TO service_role;
GRANT ALL ON public.coupons TO service_role;
GRANT ALL ON public.notification_devices TO service_role;
GRANT ALL ON public.licensing_inquiries TO service_role;
GRANT ALL ON public.password_reset_tokens TO service_role;

-- ============================================
-- STEP 26: Create storage buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('avatars', 'avatars', true),
    ('media-images', 'media-images', true),
    ('media-videos', 'media-videos', true),
    ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 27: Storage RLS Policies - Avatars
-- ============================================

CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_owner_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_owner_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- ============================================
-- STEP 28: Storage RLS Policies - Media Images
-- ============================================

CREATE POLICY "media_images_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'media-images');

CREATE POLICY "media_images_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'media-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_images_admin_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'media-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_images_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'media-images' AND public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 29: Storage RLS Policies - Media Videos
-- ============================================

CREATE POLICY "media_videos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'media-videos');

CREATE POLICY "media_videos_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'media-videos' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_videos_admin_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'media-videos' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_videos_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'media-videos' AND public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 30: Storage RLS Policies - Portfolio
-- ============================================

CREATE POLICY "portfolio_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'portfolio-images');

CREATE POLICY "portfolio_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'portfolio-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_admin_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'portfolio-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'portfolio-images' AND public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 31: Create Admin User - David Hogan
-- ============================================

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'dave0912@gmail.com',
    crypt('Access12345', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'dave0912@gmail.com'
);

INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    status,
    onboarding_completed,
    last_login,
    created_at,
    updated_at
)
SELECT
    (SELECT id FROM auth.users WHERE email = 'dave0912@gmail.com'),
    'dave0912@gmail.com',
    'David Hogan',
    'admin',
    'active',
    true,
    now(),
    now(),
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = 'dave0912@gmail.com'
);

-- ============================================
-- VERIFICATION & RESULTS
-- ============================================

SELECT 
    '=== SETUP COMPLETE ===' as status,
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.profiles) as profiles,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admins,
    (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images')) as buckets;

SELECT 
    'Admin User Details' as info,
    email,
    name,
    role,
    status,
    onboarding_completed
FROM public.profiles 
WHERE role = 'admin';

SELECT 
    'Storage Buckets' as info,
    id,
    name,
    public
FROM storage.buckets 
ORDER BY name;
