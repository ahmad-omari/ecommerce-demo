import { Router } from 'express';
import { requireUser } from './auth';
import { db, transaction } from './db';
import { HttpError, id, quantity, required } from './http';
import { receivePhotos, uploadedPhotos } from './multipart';
import { removeUploads, saveUploads } from './photos';

export const catalog = Router();
export const itemSelect = `SELECT i.id,i.name,i.title,i.description,i.price,i.stock,i.category_id,i.seller_id,
  c.name AS category,u.name AS seller,
  ARRAY(SELECT p.storage_key FROM "AH_item_photos" p WHERE p.item_id=i.id ORDER BY p.created_at,p.id) AS photos
  FROM "AH_items" i JOIN "AH_categories" c ON c.id=i.category_id JOIN "AH_users" u ON u.id=i.seller_id`;

catalog.get('/categories', async (_req, res) => {
  res.json((await db.query('SELECT id,name,creator_id FROM "AH_categories" ORDER BY name')).rows);
});
catalog.post('/categories', async (req, res) => {
  const user = await requireUser(req);
  const name = required(req.body?.name, 'Category name');
  res.status(201).json((await db.query('INSERT INTO "AH_categories" (name,creator_id) VALUES ($1,$2) RETURNING id,name,creator_id', [name,user.id])).rows[0]);
});
catalog.put('/categories/:id', async (req, res) => {
  const user = await requireUser(req);
  const result = await db.query('UPDATE "AH_categories" SET name=$1 WHERE id=$2 AND creator_id=$3 RETURNING id,name,creator_id',
    [required(req.body?.name,'Category name'),id(req.params.id),user.id]);
  if (!result.rowCount) throw new HttpError(404, 'Category not found in your categories.');
  res.json(result.rows[0]);
});
catalog.delete('/categories/:id', async (req, res) => {
  const user = await requireUser(req);
  try {
    const result = await db.query('DELETE FROM "AH_categories" WHERE id=$1 AND creator_id=$2', [id(req.params.id),user.id]);
    if (!result.rowCount) throw new HttpError(404,'Category not found in your categories.');
    res.sendStatus(204);
  } catch (error) {
    if ((error as {constraint?: string}).constraint === 'AH_items_category_check') {
      throw new HttpError(409, 'This category is used by a listing.');
    }
    throw error;
  }
});
catalog.get('/items', async (req, res) => {
  const category = req.query['category'] ? id(req.query['category']) : null;
  const search = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
  const seller = req.query['mine'] === 'true' ? (await requireUser(req)).id : null;
  res.json((await db.query(itemSelect + ` WHERE i.deleted_at IS NULL
    AND ($1::uuid IS NULL OR i.category_id=$1) AND ($2::uuid IS NULL OR i.seller_id=$2)
    AND (i.name || ' ' || i.title || ' ' || i.description) ILIKE '%' || $3 || '%'
    ORDER BY i.created_at DESC,i.name`, [category,seller,search])).rows);
});
catalog.get('/items/:id', async (req, res) => {
  const { rows } = await db.query(itemSelect + ' WHERE i.id=$1 AND i.deleted_at IS NULL', [id(req.params.id)]);
  if (!rows.length) throw new HttpError(404,'Listing not found.');
  res.json(rows[0]);
});

function fields(body: Record<string, unknown> = {}) {
  const price = required(typeof body.price === 'number' ? String(body.price) : body.price, 'Price');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
    throw new HttpError(400, 'Enter a positive USD price with up to two decimal places.');
  }
  return [required(body.name,'Name'),required(body.title,'Title'),required(body.description,'Description'),
    price,id(body.category_id),quantity(body.stock,0)];
}

catalog.post('/items', async (req, _res, next) => { await requireUser(req); next(); }, receivePhotos, async (req,res) => {
  const user = await requireUser(req);
  const values = fields(req.body);
  const keys = await saveUploads(uploadedPhotos(req));
  try {
    const itemId = await transaction(async client => {
      const { rows } = await client.query(`INSERT INTO "AH_items" (name,title,description,price,category_id,stock,seller_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [...values,user.id]);
      for (const key of keys) await client.query('INSERT INTO "AH_item_photos" (item_id,storage_key) VALUES ($1,$2)', [rows[0].id,key]);
      return rows[0].id;
    });
    res.status(201).json({ id: itemId });
  } catch (error) {
    await removeUploads(keys);
    throw error;
  }
});
catalog.put('/items/:id', async (req, _res, next) => { await requireUser(req); next(); }, receivePhotos, async (req,res) => {
  const user = await requireUser(req);
  const itemId = id(req.params.id);
  const values = fields(req.body);
  const keys = await saveUploads(uploadedPhotos(req));
  let removed: string[];
  try {
    removed = await transaction(async client => {
      const result = await client.query(`UPDATE "AH_items" SET name=$1,title=$2,description=$3,price=$4,category_id=$5,stock=$6,updated_at=now()
        WHERE id=$7 AND seller_id=$8 AND deleted_at IS NULL`, [...values,itemId,user.id]);
      if (!result.rowCount) throw new HttpError(404, 'Listing not found in your listings.');
      const removals = req.body?.remove_photos;
      const requested = typeof removals === 'string' ? [removals] : Array.isArray(removals) ? removals : [];
      const deleted = await client.query('DELETE FROM "AH_item_photos" WHERE item_id=$1 AND storage_key=ANY($2::text[]) RETURNING storage_key',
        [itemId,requested]);
      const count = await client.query('SELECT count(*)::int AS count FROM "AH_item_photos" WHERE item_id=$1', [itemId]);
      if (count.rows[0].count + keys.length > 6) throw new HttpError(400, 'A listing can have up to six photos.');
      for (const key of keys) await client.query('INSERT INTO "AH_item_photos" (item_id,storage_key) VALUES ($1,$2)', [itemId,key]);
      return deleted.rows.map(row => row.storage_key as string).filter(key => !key.startsWith('seed/'));
    });
  } catch (error) {
    await removeUploads(keys);
    throw error;
  }
  await removeUploads(removed);
  res.json({ id: itemId });
});
catalog.delete('/items/:id', async (req,res) => {
  const user = await requireUser(req);
  const result = await db.query(`UPDATE "AH_items" SET deleted_at=now(),updated_at=now()
    WHERE id=$1 AND seller_id=$2 AND deleted_at IS NULL`, [id(req.params.id),user.id]);
  if (!result.rowCount) throw new HttpError(404,'Listing not found in your listings.');
  res.sendStatus(204);
});
