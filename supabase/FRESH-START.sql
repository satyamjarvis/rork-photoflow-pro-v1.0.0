-- ============================================
-- COMPLETE DATABASE RESET & SETUP
-- Admin: Dave Hogan (dave0912@gmail.com / Access12345)
-- ============================================

-- ============================================
-- STEP 1: Drop everything
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin(UUID) CASCADE;

DO $drop_policies$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname IN ('public', 'storage')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $drop_policies$;

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DELETE FROM storage.objects WHERE bucket_id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images');
DELETE FROM storage.buckets WHERE id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images');

-- ============================================
-- STEP 2: Create tables
-- ============================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'moderator', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create helper function
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
-- STEP 4: Create RLS policies
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

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
    FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
    FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 5: Create signup trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
        RAISE NOTICE 'Profile already exists for user: %', NEW.id;
        RETURN NEW;
    WHEN others THEN
        RAISE WARNING 'handle_new_user error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 6: Grant permissions
-- ============================================

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.audit_logs TO service_role;

-- ============================================
-- STEP 7: Create storage buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('avatars', 'avatars', true),
    ('media-images', 'media-images', true),
    ('media-videos', 'media-videos', true),
    ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 8: Create storage policies
-- ============================================

CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_owner_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_owner_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "media_images_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'media-images');

CREATE POLICY "media_images_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'media-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_images_admin_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'media-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_images_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'media-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_videos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'media-videos');

CREATE POLICY "media_videos_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'media-videos' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_videos_admin_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'media-videos' AND public.check_is_admin(auth.uid()));

CREATE POLICY "media_videos_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'media-videos' AND public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'portfolio-images');

CREATE POLICY "portfolio_admin_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'portfolio-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_admin_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'portfolio-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "portfolio_admin_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'portfolio-images' AND public.check_is_admin(auth.uid()));

-- ============================================
-- STEP 9: Verification
-- ============================================

DO $verify$
DECLARE
    auth_count INTEGER;
    profile_count INTEGER;
    admin_count INTEGER;
    bucket_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO auth_count FROM auth.users;
    SELECT COUNT(*)::INTEGER INTO profile_count FROM public.profiles;
    SELECT COUNT(*)::INTEGER INTO admin_count FROM public.profiles WHERE role = 'admin';
    SELECT COUNT(*)::INTEGER INTO bucket_count FROM storage.buckets WHERE id IN ('avatars', 'media-images', 'media-videos', 'portfolio-images');
    SELECT COUNT(*)::INTEGER INTO policy_count FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE SETUP VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Auth users: %', auth_count;
    RAISE NOTICE 'Profiles: %', profile_count;
    RAISE NOTICE 'Admins: %', admin_count;
    RAISE NOTICE 'Storage buckets: %', bucket_count;
    RAISE NOTICE 'Storage policies: %', policy_count;
    RAISE NOTICE '========================================';
    
    IF auth_count = 0 THEN
        RAISE NOTICE 'No auth users yet - ready for signup';
    END IF;
    
    RAISE NOTICE 'SETUP COMPLETE!';
    RAISE NOTICE 'Next: Sign up with dave0912@gmail.com / Access12345';
    RAISE NOTICE '========================================';
END $verify$;
