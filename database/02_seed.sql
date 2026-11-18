BEGIN;
SET LOCAL search_path TO public;

INSERT INTO "AH_users" (id, name, email, password_hash) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Maya Chen', 'maya@example.test', '$2b$12$cA9Y/KarsgzTedr8wWPd1O3InPzjjJzjpBWsAtfoEvvrc3wFbYmmq'),
  ('10000000-0000-4000-8000-000000000002', 'Jordan Lee', 'jordan@example.test', '$2b$12$cA9Y/KarsgzTedr8wWPd1O3InPzjjJzjpBWsAtfoEvvrc3wFbYmmq'),
  ('10000000-0000-4000-8000-000000000003', 'Sam Rivera', 'sam@example.test', '$2b$12$cA9Y/KarsgzTedr8wWPd1O3InPzjjJzjpBWsAtfoEvvrc3wFbYmmq'),
  ('10000000-0000-4000-8000-000000000004', 'Alex Patel', 'alex@example.test', '$2b$12$cA9Y/KarsgzTedr8wWPd1O3InPzjjJzjpBWsAtfoEvvrc3wFbYmmq')
ON CONFLICT DO NOTHING;

INSERT INTO "AH_categories" (id, creator_id, name) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Electronics'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Home & Living'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Sports & Outdoors'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Books'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Arts & Hobbies')
ON CONFLICT DO NOTHING;

INSERT INTO "AH_items" (id, seller_id, category_id, name, title, description, price, stock) VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Studio Headphones', 'Wired over-ear listening', 'Closed-back headphones with a detachable cable and soft pads.', 49.50, 5),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Mini Mechanical Keyboard', 'Compact layout with tactile switches', 'USB-C keyboard with a braided cable and spare keycaps.', 39.00, 4),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Portable Hard Drive', 'Extra storage for class projects', 'One terabyte external drive with a short USB cable.', 34.00, 6),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Bluetooth Speaker', 'Pocket-size portable audio', 'Rechargeable speaker with a lanyard and charging cable.', 24.00, 7),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Sage Desk Lamp', 'Adjustable light for late study sessions', 'Metal task lamp with a pivoting shade and a warm LED bulb.', 26.00, 8),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Terracotta Mug', 'Glazed ceramic coffee mug', 'Speckled clay mug with a comfortable handle and a glazed interior.', 12.00, 10),
  ('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Oak Floating Shelf', 'Wall shelf with hidden brackets', 'Solid oak shelf with two mounting brackets included.', 33.00, 3),
  ('30000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Glass French Press', 'Four-cup coffee press', 'Heat-resistant glass carafe with a stainless mesh filter.', 18.00, 4),
  ('30000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Blue Daypack', 'Lightweight bag for campus', 'Twenty-liter daypack with a laptop sleeve and bottle pockets.', 29.00, 5),
  ('30000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'Cushioned Yoga Mat', 'Grippy mat with carry strap', 'Six-millimeter mat in sage green with a woven shoulder strap.', 16.00, 9),
  ('30000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Steel Water Bottle', 'Insulated bottle with screw cap', 'Holds 24 ounces and fits a standard backpack pocket.', 15.00, 11),
  ('30000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003', 'Bike Helmet', 'Adjustable gray commuter helmet', 'Unused medium helmet with a rear dial and removable pads.', 25.00, 2),
  ('30000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'Microeconomics Textbook', 'Introductory course reference', 'Paperback with practice problems and a clean interior.', 32.00, 5),
  ('30000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'Blue Graphic Novel', 'A standalone illustrated adventure', 'Hardcover copy with full-color illustrations and a dust jacket.', 14.00, 3),
  ('30000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Calculus Textbook', 'Single-variable calculus', 'Secondhand textbook with worked examples and light pencil marks.', 42.00, 4),
  ('30000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'Paperback Novel Set', 'Three contemporary novels', 'A set of gently used paperbacks for a weekend read.', 17.00, 6),
  ('30000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'Watercolor Paint Set', 'Travel palette with 24 colors', 'Compact watercolor set with a mixing tray and a short brush.', 23.00, 7),
  ('30000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'Tabletop Easel', 'Foldable wooden art stand', 'Beechwood easel with an adjustable angle for small canvases.', 28.00, 4),
  ('30000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000005', 'Knitting Starter Kit', 'Wooden needles and soft yarn', 'Two pairs of needles and three neutral skeins with a pattern card.', 19.00, 6),
  ('30000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'Instant Camera', 'Compact camera for instant prints', 'Uses mini instant film. Includes wrist strap and batteries.', 58.00, 0)
ON CONFLICT DO NOTHING;

INSERT INTO "AH_item_photos" (id, item_id, storage_key) VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'seed/item-1.jpg'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'seed/item-2.jpg'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'seed/item-3.jpg'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'seed/item-4.jpg'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'seed/item-5.jpg'),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'seed/item-6.jpg'),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', 'seed/item-7.jpg'),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', 'seed/item-8.jpg'),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000009', 'seed/item-9.jpg'),
  ('40000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000010', 'seed/item-10.jpg'),
  ('40000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000011', 'seed/item-11.jpg'),
  ('40000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000012', 'seed/item-12.jpg'),
  ('40000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000013', 'seed/item-13.jpg'),
  ('40000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000014', 'seed/item-14.jpg'),
  ('40000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000015', 'seed/item-15.jpg'),
  ('40000000-0000-4000-8000-000000000016', '30000000-0000-4000-8000-000000000016', 'seed/item-16.jpg'),
  ('40000000-0000-4000-8000-000000000017', '30000000-0000-4000-8000-000000000017', 'seed/item-17.jpg'),
  ('40000000-0000-4000-8000-000000000018', '30000000-0000-4000-8000-000000000018', 'seed/item-18.jpg'),
  ('40000000-0000-4000-8000-000000000019', '30000000-0000-4000-8000-000000000019', 'seed/item-19.jpg'),
  ('40000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000020', 'seed/item-20.jpg')
ON CONFLICT DO NOTHING;

WITH new_carts AS (
  INSERT INTO "AH_carts" (user_id) VALUES ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002')
  ON CONFLICT DO NOTHING RETURNING user_id
)
INSERT INTO "AH_cart_items" (user_id,item_id,quantity)
SELECT c.user_id,x.item_id,x.quantity FROM new_carts c JOIN (VALUES
  ('10000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,1),
  ('10000000-0000-4000-8000-000000000002'::uuid,'30000000-0000-4000-8000-000000000005'::uuid,2)
) x(user_id,item_id,quantity) ON x.user_id=c.user_id;

WITH new_order AS (
  INSERT INTO "AH_orders" (id,buyer_id,total,created_at) VALUES
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 80.00, '2025-09-10 14:00:00+00')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO "AH_order_items" (order_id,item_id,item_name,seller_id,seller_name,unit_price,quantity)
SELECT o.id,x.item_id::uuid,x.item_name,x.seller_id::uuid,x.seller_name,x.unit_price,x.quantity
FROM new_order o CROSS JOIN (VALUES
  ('30000000-0000-4000-8000-000000000003', 'Portable Hard Drive', '10000000-0000-4000-8000-000000000003', 'Sam Rivera', 34.00, 2),
  ('30000000-0000-4000-8000-000000000006', 'Terracotta Mug', '10000000-0000-4000-8000-000000000002', 'Jordan Lee', 12.00, 1)
) x(item_id,item_name,seller_id,seller_name,unit_price,quantity);

WITH new_order AS (
  INSERT INTO "AH_orders" (id,buyer_id,total,created_at) VALUES
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 53.00, '2025-09-11 14:00:00+00')
  ON CONFLICT DO NOTHING RETURNING id
)
INSERT INTO "AH_order_items" (order_id,item_id,item_name,seller_id,seller_name,unit_price,quantity)
SELECT o.id,x.item_id::uuid,x.item_name,x.seller_id::uuid,x.seller_name,x.unit_price,x.quantity
FROM new_order o CROSS JOIN (VALUES
  ('30000000-0000-4000-8000-000000000004', 'Bluetooth Speaker', '10000000-0000-4000-8000-000000000004', 'Alex Patel', 24.00, 1),
  ('30000000-0000-4000-8000-000000000009', 'Blue Daypack', '10000000-0000-4000-8000-000000000001', 'Maya Chen', 29.00, 1)
) x(item_id,item_name,seller_id,seller_name,unit_price,quantity);

INSERT INTO "AH_favorites" (user_id, item_id) VALUES
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000009'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000011'),
  ('10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000008'),
  ('10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000017')
ON CONFLICT DO NOTHING;

COMMIT;
