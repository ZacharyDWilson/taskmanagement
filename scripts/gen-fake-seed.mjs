// Reads the shop_items / cosmetics rows out of supabase/*.sql and writes src/lib/fakeSeed.json,
// which the fake backend of the preview build (npm run build:wip) uses to fill the shop.
// Run it again whenever a migration adds shop items:  node scripts/gen-fake-seed.mjs
import fs from 'fs'
import path from 'path'

const dir = 'supabase'
const files = fs.readdirSync(dir).filter(f => /^\d+.*\.sql$/.test(f)).sort()
const cosmetics = new Map()
const shop = new Map()

const tuple = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?(?:,\s*(true|false)\s*)?\)/g
// achievements: (id, name, description, icon, tier, stat, goal, coins, reward item or null, sort)
const achTuple = /\(\s*'([^']+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'([^']+)'\s*,\s*'(bronze|silver|gold)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(null|'[^']+')\s*,\s*(\d+)\s*\)/g
const achievements = new Map()

for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8')
  const stmt = /insert\s+into\s+public\.(cosmetics|shop_items)[^;]*?values([\s\S]*?)(?:on\s+conflict|;)/gi
  let m
  while ((m = stmt.exec(sql))) {
    const table = m[1].toLowerCase()
    let t
    tuple.lastIndex = 0
    while ((t = tuple.exec(m[2]))) {
      const [, id, kind, rawName, n1, n2, ex] = t
      const name = rawName.replace(/''/g, "'")
      if (table === 'cosmetics') cosmetics.set(id, { id, kind, name, min_level: Number(n1) })
      else shop.set(id, { id, kind, name, price: Number(n1), sort: Number(n2 ?? 0), exclusive: ex === 'true' })
    }
  }
}

for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8')
  const ins = /insert\s+into\s+public\.achievements[^;]*?values([\s\S]*?)on\s+conflict/gi
  let b
  while ((b = ins.exec(sql))) {
    achTuple.lastIndex = 0
    let a
    while ((a = achTuple.exec(b[1]))) {
      const [, id, name, desc, icon, tier, stat, goal, coins, item, sort] = a
      achievements.set(id, { id, name: name.replace(/''/g, "'"), description: desc.replace(/''/g, "'"), icon, tier, stat, goal: Number(goal), reward_coins: Number(coins), reward_item: item === 'null' ? null : item.slice(1, -1), sort: Number(sort) })
    }
  }
}

const upd = /update\s+public\.shop_items\s+set\s+price\s*=\s*(\d+)\s+where\s+id\s+in\s*\(([^)]*)\)/gi
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8')
  let u
  while ((u = upd.exec(sql))) for (const id of u[2].match(/[\w-]+/g)) if (shop.has(id)) shop.get(id).price = Number(u[1])
}

// the starter-theme ids (free looks) so the shop knows them
const out = { cosmetics: [...cosmetics.values()], shop_items: [...shop.values()], achievements: [...achievements.values()] }
fs.writeFileSync('src/lib/fakeSeed.json', JSON.stringify(out, null, 1))
console.log(`cosmetics: ${out.cosmetics.length}, shop items: ${out.shop_items.length}`)
