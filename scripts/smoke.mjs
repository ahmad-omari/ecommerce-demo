import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const base = process.env.SMOKE_URL || 'http://localhost:9090';
const suffix = randomUUID().slice(0,8);
const password = 'DemoShop123';

function client() {
  let cookie = '';
  return async (method, path, body, status = 200) => {
    const headers = cookie ? { cookie } : {};
    if (body && !(body instanceof FormData)) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const response = await fetch(base + '/api' + path, { method, headers, body });
    const session = response.headers.get('set-cookie');
    if (session) cookie = session.split(';')[0];
    if (response.status !== status) {
      assert.fail(method + ' ' + path + ' expected ' + status + ', got ' + response.status + ' ' + (await response.text()).slice(0,300));
    }
    if (status === 204) return;
    if (response.headers.get('content-type')?.startsWith('image/')) return response.arrayBuffer();
    return response.json();
  };
}

const anonymous = client();
assert.equal((await anonymous('GET','/health')).status,'ok');
assert.equal(await anonymous('GET','/auth/me'),null);
await anonymous('GET','/cart',undefined,401);
const items = await anonymous('GET','/items');
assert.ok(items.length >= 20);
assert.ok(items.some(item => item.stock === 0));
const matches = await anonymous('GET','/items?q=keyboard');
assert.ok(matches.some(item => item.name === 'Mini Mechanical Keyboard'));
const image = await anonymous('GET','/photos/' + items.find(item => item.photos.length).photos[0]);
assert.ok(image.byteLength > 0);

for (const name of ['maya','jordan','sam','alex']) {
  const login = client();
  const email = name + '@example.test';
  assert.equal((await login('POST','/auth/login',{email,password})).email,email);
  assert.equal((await login('GET','/auth/me')).email,email);
  await login('POST','/auth/logout',{},204);
  assert.equal(await login('GET','/auth/me'),null);
}
console.log('Health, public browsing, seed images, and all four demo logins passed.');

async function register(role) {
  const account = client();
  const user = await account('POST','/auth/register',{name:'Smoke ' + role,email:role + '-' + suffix + '@example.test',password});
  return { account,user };
}

const {account:sell,user:seller} = await register('seller');
const {account:buy} = await register('buyer');
const {account:other,user:otherSeller} = await register('other-seller');
const category = await sell('POST','/categories',{name:'Smoke ' + suffix},201);
await sell('PUT','/categories/' + category.id,{name:'Smoke demo ' + suffix});
await buy('PUT','/categories/' + category.id,{name:'Attempted edit'},404);

function listing(price, stock, title = 'Smoke test fixture') {
  const form = new FormData();
  for (const [key,value] of Object.entries({name:'Smoke item ' + suffix,title,description:'Created by the API smoke test.',price,category_id:category.id,stock})) {
    form.set(key,String(value));
  }
  return form;
}
const fixture = await readFile(new URL('../public/seed/item-1.jpg',import.meta.url));
const create = listing('12.34',3);
create.append('photos',new Blob([fixture],{type:'image/jpeg'}),'one.jpg');
create.append('photos',new Blob([fixture],{type:'image/jpeg'}),'two.jpg');
const {id} = await sell('POST','/items',create,201);
const second = (await other('POST','/items',listing('7.25',5),201)).id;
const initial = await anonymous('GET','/items/' + id);
assert.equal(initial.photos.length,2);
assert.ok((await anonymous('GET','/photos/' + initial.photos[0])).byteLength > 0);
const edit = listing('12.35',4,'Edited smoke listing');
edit.append('remove_photos',initial.photos[0]);
await sell('PUT','/items/' + id,edit);
const edited = await anonymous('GET','/items/' + id);
assert.equal(edited.title,'Edited smoke listing');
assert.equal(edited.photos.length,1);
await buy('PUT','/items/' + id,listing('0.01',4),404);
await sell('DELETE','/categories/' + category.id,undefined,409);
await sell('PUT','/cart/' + id,{quantity:1},400);
await buy('PUT','/cart/' + id,{quantity:5},409);

await buy('PUT','/favorites/' + id,{},204);
await buy('PUT','/favorites/' + id,{},204);
assert.deepEqual((await buy('GET','/favorites')).map(item => item.id),[id]);
await buy('DELETE','/favorites/' + id,undefined,204);
assert.deepEqual(await buy('GET','/favorites'),[]);
await buy('PUT','/cart/' + id,{quantity:1,add:true},204);
await buy('PUT','/cart/' + id,{quantity:2},204);
await buy('PUT','/cart/' + second,{quantity:1},204);
await buy('DELETE','/cart/' + second,undefined,204);
await buy('PUT','/cart/' + second,{quantity:1},204);
assert.equal((await buy('GET','/cart')).total,'31.95');

const order = await buy('POST','/checkout',{},201);
assert.equal(order.total,'31.95');
assert.deepEqual((await buy('GET','/cart')).items,[]);
assert.equal((await anonymous('GET','/items/' + id)).stock,2);
assert.equal((await anonymous('GET','/items/' + second)).stock,4);
assert.ok((await buy('GET','/orders')).some(entry => entry.id === order.id));
await sell('GET','/orders/' + order.id,undefined,404);
await sell('DELETE','/items/' + id,undefined,204);
await other('DELETE','/items/' + second,undefined,204);
await sell('DELETE','/categories/' + category.id,undefined,204);
await anonymous('GET','/items/' + id,undefined,404);
const history = await buy('GET','/orders/' + order.id);
assert.deepEqual(new Set(history.items.map(line => line.seller_name)),new Set([seller.name,otherSeller.name]));
assert.equal(history.items.find(line => line.item_id === id).unit_price,'12.35');
assert.equal(history.items.find(line => line.item_id === id).quantity,2);
for (const account of [sell,buy,other]) await account('POST','/auth/logout',{},204);
console.log('Registration, category ownership, listing CRUD and photos, cart, favorites, multi-seller checkout, stock changes, and private order history passed.');
