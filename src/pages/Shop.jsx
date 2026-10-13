import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShop } from '../lib/shop.jsx'
import { useTheme, THEMES } from '../lib/theme.jsx'
import { useToast } from '../lib/toast.jsx'
import { useMyXp } from '../lib/xp.jsx'
import { xpForLevel } from '../lib/levels.js'
import { TIMER_STYLES } from '../lib/timerStyles.js'
import TimerFace from '../components/TimerFace.jsx'

const themeById = Object.fromEntries(THEMES.map(t => [t.id, t]))

function Swatch({ colors }) {
  return (
    <span className="theme-swatch" aria-hidden="true">
      {colors.map((c, i) => <i key={i} style={{ background: c }} />)}
    </span>
  )
}

export default function Shop() {
  const { items, owned, balance, starterChosen, buy, chooseStarter } = useShop()
  const { theme, setTheme } = useTheme()
  const { xp, level } = useMyXp()
  const toast = useToast()
  const [busy, setBusy] = useState('')

  const themes = items.filter(i => i.kind === 'theme')
  const banners = items.filter(i => i.kind === 'banner')
  const frames = items.filter(i => i.kind === 'frame')
  const timers = items.filter(i => i.kind === 'timer')

  async function run(id, action, success) {
    setBusy(id)
    const error = await action(id)
    setBusy('')
    if (error) toast(error)
    else { toast(success, 'xp'); return true }
    return false
  }

  const pickStarter = async id => {
    if (await run(id, chooseStarter, `${themeById[id]?.name} is yours. Enjoy!`)) setTheme(id)
  }
  const purchase = (id, name) => run(id, buy, `You bought ${themeById[id]?.name ?? name}!`)

  // How far to the next level-up bonus, so coins feel predictable.
  const nextLevel = level + 1
  const toNext = Math.max(0, xpForLevel(nextLevel) - (xp ?? 0))

  return (
    <div className="shop">
      <header className="card shop-head">
        <div>
          <h1>Shop</h1>
          <p className="muted">Spend coins on themes for your page. Coins come from XP, and spending them never lowers your level.</p>
        </div>
        <div className="balance" aria-label={`${balance} coins`}>
          <span className="balance-coin">🪙</span>
          <strong>{balance.toLocaleString()}</strong>
          <small>coins</small>
        </div>
      </header>

      <section className="card">
        <h2>Themes</h2>
        <div className="themes">
          <div className={'theme-opt shop-card' + (theme === 'default' ? ' on' : '')} data-t="default">
            <Swatch colors={themeById.default.preview} />
            <strong>Classic</strong>
            <small>{themeById.default.blurb}</small>
            {theme === 'default'
              ? <span className="owned">✓ Equipped</span>
              : <button className="secondary" onClick={() => setTheme('default')}>Equip</button>}
          </div>

          <div className={'theme-opt shop-card' + (theme === 'dark' ? ' on' : '')} data-t="dark">
            <Swatch colors={themeById.dark.preview} />
            <strong>Classic Dark</strong>
            <small>{themeById.dark.blurb}</small>
            {theme === 'dark'
              ? <span className="owned">✓ Equipped</span>
              : <button className="secondary" onClick={() => setTheme('dark')}>Equip</button>}
          </div>

          {themes.map(item => {
            const t = themeById[item.id]
            const has = owned.has(item.id)
            const short = item.price - balance
            return (
              <div key={item.id} className={'theme-opt shop-card' + (theme === item.id ? ' on' : '')} data-t={item.id}>
                <Swatch colors={t.preview} />
                <strong>{item.name}</strong>
                <small>{t.blurb}</small>
                {has && theme === item.id && <span className="owned">✓ Equipped</span>}
                {has && theme !== item.id && (
                  <div className="row">
                    <button className="secondary" onClick={() => setTheme(item.id)}>Equip</button>
                    <span className="tag-owned">Owned</span>
                  </div>
                )}
                {!has && (
                  <button onClick={() => purchase(item.id)} disabled={short > 0 || !!busy}
                    title={short > 0 ? `You need ${short} more coins` : ''}>
                    {busy === item.id ? 'Buying…' : `🪙 ${item.price}`}
                    {short > 0 && <small className="need"> need {short} more</small>}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {themes.length === 0 && <p className="muted">The shop is empty right now.</p>}
      </section>

      {[['Banners', banners, 'banner'], ['Frames', frames, 'frame'], ['Timer styles', timers, 'timer']].map(([title, list, kind]) => list.length > 0 && (
        <section className="card" key={kind}>
          <h2>{title} <small>{kind === 'timer' ? 'for the Study timer' : 'show on your profile'}</small></h2>
          <div className="themes">
            {list.map(item => {
              const has = owned.has(item.id)
              const short = item.price - balance
              return (
                <div key={item.id} className="theme-opt shop-card">
                  {kind === 'timer'
                    ? <span className="timer-thumb" aria-hidden="true"><TimerFace styleId={item.id.replace('timer-', '')} left={600000} total={1500000} mode="focus" running={false} small /></span>
                    : <span className={'swatch-preview shop-' + kind + ' ' + item.id} aria-hidden="true" />}
                  <strong>{item.name}</strong>
                  {has
                    ? <span className="owned">✓ Owned {kind === 'timer' ? <Link to="/study" className="small">Use it on Study</Link> : <Link to="/profile" className="small">Equip on your profile</Link>}</span>
                    : (
                      <button onClick={() => purchase(item.id, item.name)} disabled={short > 0 || !!busy}
                        title={short > 0 ? `You need ${short} more coins` : ''}>
                        {busy === item.id ? 'Buying…' : `🪙 ${item.price}`}
                        {short > 0 && <small className="need"> need {short} more</small>}
                      </button>
                    )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className="card">
        <h2>How to earn coins</h2>
        <ul className="earn">
          <li><strong>1 coin</strong> for every 5 XP you earn (focus minutes, finished tasks, posts, reactions).</li>
          <li><strong>Level-up bonus:</strong> 25 coins × the level you reach. Level {nextLevel} pays <strong>{25 * nextLevel} coins</strong>, and you're {toNext.toLocaleString()} XP away.</li>
        </ul>
        <p className="muted small">Keep an eye on your level in the top bar. <Link to="/todo">Finish a task</Link> or <Link to="/study">start a focus session</Link> to earn.</p>
      </section>
    </div>
  )
}
