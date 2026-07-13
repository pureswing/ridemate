-- ============================================================
-- RideMate MVP - Supabase Schema
-- Tablón de anuncios de movilidad para Florida
-- Modelo: directorio de anuncios, sin intermediación de pagos
-- ============================================================

-- PROFILES: extiende auth.users con datos de la app
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  phone                 TEXT,
  avatar_url            TEXT,
  default_role          TEXT NOT NULL DEFAULT 'passenger'
                          CHECK (default_role IN ('driver', 'passenger')),
  disclaimer_accepted_at TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUBSCRIPTIONS: estado de suscripción/donación por usuario
CREATE TABLE public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'free'
                          CHECK (status IN ('free', 'active', 'expired', 'cancelled')),
  plan                  TEXT CHECK (plan IN ('monthly', 'annual', 'donation')),
  amount_donated        NUMERIC(10, 2),
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  revenuecat_entitlement TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- RIDE_POSTS: tablón de anuncios principal
-- type='offer'   → conductor publicando disponibilidad de viaje
-- type='request' → pasajero publicando necesidad de viaje
CREATE TABLE public.ride_posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('offer', 'request')),
  origin_city         TEXT NOT NULL,
  origin_address      TEXT,
  destination_city    TEXT NOT NULL,
  destination_address TEXT,
  origin_lat          NUMERIC(10, 6),
  origin_lng          NUMERIC(10, 6),
  destination_lat     NUMERIC(10, 6),
  destination_lng     NUMERIC(10, 6),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  seats_available     INTEGER CHECK (seats_available BETWEEN 1 AND 8),
  -- "suggested_donation" es solo una referencia informal para gastos compartidos,
  -- NO es una tarifa ni procesada por la plataforma (compliance TNC Florida)
  suggested_donation  NUMERIC(10, 2),
  description         TEXT,
  contact_method      TEXT NOT NULL
                        CHECK (contact_method IN ('in_app', 'whatsapp', 'phone', 'email')),
  contact_value       TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'filled', 'cancelled', 'expired')),
  views_count         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- CONTACT_REVEALS: log auditable de quién consultó el contacto de quién
-- Sirve como protección legal y para futura funcionalidad de rating
CREATE TABLE public.contact_reveals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES public.ride_posts(id) ON DELETE CASCADE,
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  revealed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, requester_id)
);

-- AUDIT_LOGS: mínimo log de acciones para compliance y seguridad
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Ride posts: cualquiera puede leer anuncios activos
CREATE POLICY "Active posts are viewable by everyone"
  ON public.ride_posts FOR SELECT USING (status = 'active');

CREATE POLICY "Users can insert their own posts"
  ON public.ride_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.ride_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.ride_posts FOR DELETE USING (auth.uid() = user_id);

-- Contact reveals
CREATE POLICY "Users can reveal contacts"
  ON public.contact_reveals FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own reveals"
  ON public.contact_reveals FOR SELECT USING (auth.uid() = requester_id);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Crear perfil y suscripción free automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'free');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ride_posts_updated_at
  BEFORE UPDATE ON public.ride_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Incrementar vistas de un post (llamado desde la app via RPC)
CREATE OR REPLACE FUNCTION public.increment_post_views(post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ride_posts
  SET views_count = views_count + 1
  WHERE id = post_id;
END;
$$;

-- Expirar posts vencidos (ejecutar con pg_cron o manualmente)
CREATE OR REPLACE FUNCTION public.expire_old_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE public.ride_posts
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================

CREATE INDEX idx_ride_posts_origin_city      ON public.ride_posts (origin_city);
CREATE INDEX idx_ride_posts_destination_city  ON public.ride_posts (destination_city);
CREATE INDEX idx_ride_posts_scheduled_at      ON public.ride_posts (scheduled_at);
CREATE INDEX idx_ride_posts_status            ON public.ride_posts (status);
CREATE INDEX idx_ride_posts_type              ON public.ride_posts (type);
CREATE INDEX idx_ride_posts_user_id           ON public.ride_posts (user_id);
CREATE INDEX idx_ride_posts_expires_at        ON public.ride_posts (expires_at);
CREATE INDEX idx_contact_reveals_requester    ON public.contact_reveals (requester_id);
CREATE INDEX idx_audit_logs_user_id           ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at        ON public.audit_logs (created_at DESC);
