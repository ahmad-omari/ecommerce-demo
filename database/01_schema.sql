BEGIN;
SET LOCAL search_path TO public;

CREATE TABLE IF NOT EXISTS "AH_users" (
 id uuid DEFAULT gen_random_uuid() CONSTRAINT "AH_users_pkey" PRIMARY KEY,
 name text NOT NULL,
 email text NOT NULL CONSTRAINT "AH_users_email_key" UNIQUE,
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "AH_sessions" (
 token_hash text CONSTRAINT "AH_sessions_pkey" PRIMARY KEY,
 user_id uuid NOT NULL CONSTRAINT "AH_sessions_user_fk" REFERENCES "AH_users"(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS "AH_categories" (
 id uuid DEFAULT gen_random_uuid() CONSTRAINT "AH_categories_pkey" PRIMARY KEY,
 creator_id uuid NOT NULL CONSTRAINT "AH_categories_creator_fk" REFERENCES "AH_users"(id),
 name text NOT NULL CONSTRAINT "AH_categories_name_key" UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "AH_items" (
 id uuid DEFAULT gen_random_uuid() CONSTRAINT "AH_items_pkey" PRIMARY KEY,
 seller_id uuid NOT NULL CONSTRAINT "AH_items_seller_fk" REFERENCES "AH_users"(id),
 category_id uuid CONSTRAINT "AH_items_category_fk" REFERENCES "AH_categories"(id) ON DELETE SET NULL,
 name text NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 price numeric(12,2) NOT NULL CONSTRAINT "AH_items_price_check" CHECK (price > 0),
 stock integer NOT NULL CONSTRAINT "AH_items_stock_check" CHECK (stock >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz,
 CONSTRAINT "AH_items_category_check" CHECK (deleted_at IS NOT NULL OR category_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS "AH_item_photos" (
 id uuid DEFAULT gen_random_uuid() CONSTRAINT "AH_item_photos_pkey" PRIMARY KEY,
 item_id uuid NOT NULL CONSTRAINT "AH_item_photos_item_fk" REFERENCES "AH_items"(id),
 storage_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "AH_item_photos_unique" UNIQUE (item_id, storage_key)
);
CREATE TABLE IF NOT EXISTS "AH_carts" (
 user_id uuid CONSTRAINT "AH_carts_pkey" PRIMARY KEY CONSTRAINT "AH_carts_user_fk" REFERENCES "AH_users"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "AH_cart_items" (
 user_id uuid CONSTRAINT "AH_cart_items_cart_fk" REFERENCES "AH_carts"(user_id),
 item_id uuid CONSTRAINT "AH_cart_items_item_fk" REFERENCES "AH_items"(id),
 quantity integer NOT NULL CONSTRAINT "AH_cart_items_quantity_check" CHECK (quantity > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "AH_cart_items_pkey" PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS "AH_favorites" (
 user_id uuid CONSTRAINT "AH_favorites_user_fk" REFERENCES "AH_users"(id),
 item_id uuid CONSTRAINT "AH_favorites_item_fk" REFERENCES "AH_items"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "AH_favorites_pkey" PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS "AH_orders" (
 id uuid DEFAULT gen_random_uuid() CONSTRAINT "AH_orders_pkey" PRIMARY KEY,
 buyer_id uuid NOT NULL CONSTRAINT "AH_orders_buyer_fk" REFERENCES "AH_users"(id),
 total numeric(14,2) NOT NULL CONSTRAINT "AH_orders_total_check" CHECK (total > 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "AH_order_items" (
 order_id uuid CONSTRAINT "AH_order_items_order_fk" REFERENCES "AH_orders"(id),
 item_id uuid CONSTRAINT "AH_order_items_item_fk" REFERENCES "AH_items"(id),
 item_name text NOT NULL,
 seller_id uuid NOT NULL CONSTRAINT "AH_order_items_seller_fk" REFERENCES "AH_users"(id),
 seller_name text NOT NULL,
 unit_price numeric(12,2) NOT NULL CONSTRAINT "AH_order_items_price_check" CHECK (unit_price > 0),
 quantity integer NOT NULL CONSTRAINT "AH_order_items_quantity_check" CHECK (quantity > 0),
 CONSTRAINT "AH_order_items_pkey" PRIMARY KEY (order_id, item_id)
);
CREATE INDEX IF NOT EXISTS "AH_items_seller_idx" ON "AH_items" (seller_id);
CREATE INDEX IF NOT EXISTS "AH_items_category_idx" ON "AH_items" (category_id);
CREATE INDEX IF NOT EXISTS "AH_items_created_idx" ON "AH_items" (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "AH_orders_buyer_idx" ON "AH_orders" (buyer_id, created_at DESC);
COMMIT;
