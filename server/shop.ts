import { Router } from 'express';
import { PoolClient } from 'pg';
import { requireUser } from './auth';
import { itemSelect } from './catalog';
import { db, transaction } from './db';
import { HttpError, id, quantity } from './http';

export const shop = Router();
async function lockCart(client: PoolClient, userId: string) {
  await client.query('INSERT INTO "AH_carts" (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  await client.query('SELECT user_id FROM "AH_carts" WHERE user_id=$1 FOR UPDATE', [userId]);
}
shop.get('/cart', async (req,res) => {
  const user = await requireUser(req);
  const { rows } = await db.query(`SELECT i.id,i.name,i.price,i.stock,ci.quantity,ci.quantity*i.price AS subtotal,
    i.deleted_at IS NULL AS available,SUM(ci.quantity*i.price) OVER () AS total
    FROM "AH_cart_items" ci JOIN "AH_items" i ON i.id=ci.item_id WHERE ci.user_id=$1 ORDER BY ci.created_at,i.id`, [user.id]);
  res.json({ items: rows, total: rows[0]?.total ?? '0.00' });
});
shop.put('/cart/:id', async (req,res) => {
  const user = await requireUser(req);
  const itemId = id(req.params.id);
  const amount = quantity(req.body?.quantity,1);
  await transaction(async client => {
    await lockCart(client,user.id);
    const { rows } = await client.query(`SELECT i.stock,i.seller_id,ci.quantity FROM "AH_items" i
      LEFT JOIN "AH_cart_items" ci ON ci.item_id=i.id AND ci.user_id=$2
      WHERE i.id=$1 AND i.deleted_at IS NULL FOR SHARE OF i`, [itemId,user.id]);
    const item = rows[0];
    if (!item) throw new HttpError(404,'Listing is unavailable.');
    if (item.seller_id === user.id) throw new HttpError(400,'You cannot buy your own listing.');
    const next = req.body?.add === true ? (item.quantity ?? 0) + amount : amount;
    if (next > item.stock) throw new HttpError(409,'There is insufficient stock.');
    await client.query(`INSERT INTO "AH_cart_items" (user_id,item_id,quantity) VALUES ($1,$2,$3)
      ON CONFLICT (user_id,item_id) DO UPDATE SET quantity=excluded.quantity`, [user.id,itemId,next]);
  });
  res.sendStatus(204);
});
shop.delete('/cart/:id', async (req,res) => {
  const user = await requireUser(req);
  const itemId = id(req.params.id);
  await transaction(async client => {
    await lockCart(client,user.id);
    await client.query('DELETE FROM "AH_cart_items" WHERE user_id=$1 AND item_id=$2',[user.id,itemId]);
  });
  res.sendStatus(204);
});
shop.get('/favorites', async (req,res) => {
  const user = await requireUser(req);
  res.json((await db.query(itemSelect + ` JOIN "AH_favorites" f ON f.item_id=i.id
    WHERE f.user_id=$1 AND i.deleted_at IS NULL ORDER BY f.created_at DESC`, [user.id])).rows);
});
shop.put('/favorites/:id', async (req,res) => {
  const user = await requireUser(req);
  await db.query(`INSERT INTO "AH_favorites" (user_id,item_id)
    SELECT $1,id FROM "AH_items" WHERE id=$2 AND deleted_at IS NULL ON CONFLICT DO NOTHING`,[user.id,id(req.params.id)]);
  res.sendStatus(204);
});
shop.delete('/favorites/:id', async (req,res) => {
  const user = await requireUser(req);
  await db.query('DELETE FROM "AH_favorites" WHERE user_id=$1 AND item_id=$2',[user.id,id(req.params.id)]);
  res.sendStatus(204);
});
shop.post('/checkout', async (req,res) => {
  const user = await requireUser(req);
  const order = await transaction(async client => {
    await lockCart(client,user.id);
    const cart = await client.query(`SELECT i.name,i.stock,i.deleted_at,i.seller_id,ci.quantity
      FROM "AH_cart_items" ci JOIN "AH_items" i ON i.id=ci.item_id
      WHERE ci.user_id=$1 ORDER BY i.id FOR UPDATE OF i`, [user.id]);
    if (!cart.rowCount) throw new HttpError(400,'Your cart is empty.');
    for (const item of cart.rows) {
      if (item.deleted_at || item.stock < item.quantity || item.seller_id === user.id) {
        throw new HttpError(409, item.name + ' is unavailable at the requested quantity.');
      }
    }
    const { rows } = await client.query(`INSERT INTO "AH_orders" (buyer_id,total)
      SELECT $1,SUM(i.price*ci.quantity) FROM "AH_cart_items" ci JOIN "AH_items" i ON i.id=ci.item_id
      WHERE ci.user_id=$1 RETURNING id,total,created_at`, [user.id]);
    await client.query(`INSERT INTO "AH_order_items" (order_id,item_id,item_name,seller_id,seller_name,unit_price,quantity)
      SELECT $1,i.id,i.name,i.seller_id,u.name,i.price,ci.quantity
      FROM "AH_cart_items" ci JOIN "AH_items" i ON i.id=ci.item_id JOIN "AH_users" u ON u.id=i.seller_id
      WHERE ci.user_id=$2`, [rows[0].id,user.id]);
    await client.query(`UPDATE "AH_items" i SET stock=i.stock-ci.quantity,updated_at=now()
      FROM "AH_cart_items" ci WHERE ci.user_id=$1 AND ci.item_id=i.id`, [user.id]);
    await client.query('DELETE FROM "AH_cart_items" WHERE user_id=$1',[user.id]);
    return rows[0];
  });
  res.status(201).json(order);
});
shop.get('/orders', async (req,res) => {
  const user = await requireUser(req);
  res.json((await db.query('SELECT id,total,created_at FROM "AH_orders" WHERE buyer_id=$1 ORDER BY created_at DESC',[user.id])).rows);
});
shop.get('/orders/:id', async (req,res) => {
  const user = await requireUser(req);
  const { rows } = await db.query(`SELECT o.id,o.total,o.created_at,
    (SELECT json_agg(json_build_object('item_id',oi.item_id,'item_name',oi.item_name,'seller_name',oi.seller_name,
      'unit_price',oi.unit_price::text,'quantity',oi.quantity) ORDER BY oi.item_name)
      FROM "AH_order_items" oi WHERE oi.order_id=o.id) AS items
    FROM "AH_orders" o WHERE o.id=$1 AND o.buyer_id=$2`,[id(req.params.id),user.id]);
  if (!rows.length) throw new HttpError(404,'Order not found.');
  res.json(rows[0]);
});
