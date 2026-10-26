import { Fragment, useState } from 'react'
import Coin from '../components/Coin.jsx'
import { Link } from 'react-router-dom'
import { useShop } from '../lib/shop.jsx'
import { useTheme, THEMES } from '../lib/theme.jsx'
import { useToast } from '../lib/toast.jsx'
import { useMyXp } from '../lib/xp.jsx'
import { xpForLevel } from '../lib/levels.js'
import { TIMER_STYLES } from '../lib/timerStyles.js'
import TimerFace from '../components/TimerFace.jsx'
import { FramePreview } from '../components/Avatar.jsx'
import ThemePreview from '../components/ThemePreview.jsx'
import XpCoinGuide from '../components/XpCoinGuide.jsx'

const themeById = Object.fromEntries(THEMES.map(t => [t.id, t]))

function Swatch({ id, colors }) {
  return <ThemePreview id={id} colors={colors} />
}

export default function Shop() {
  const { items, owned, balance, starterChosen, buy, chooseStarter } = useShop()
  const { theme, setTheme } = useTheme()
  const { xp, level } = useMyXp()
  const { bundles = [], buyBundle } = useShop()
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const [tab, setTabState] = useState(() => { try { return localStorage.getItem('lock-in-shop-tab') || 'themes' } catch { return 'themes' } })
  const setTab = id => { setTabState(id); try { localStorage.setItem('lock-in-shop-tab', id) } catch { /* ignore */ } }

  // earn-only styles (achievement rewards) are never for sale
  const sellable = items.filter(i => !i.exclusive)
  // three tiers, cheapest first: plain colour themes, signature-dock themes, then Style packs (which change everything)
  const tierOf = id => (themeById[id]?.style ? 2 : themeById[id]?.signature ? 1 : 0)
  const themes = sellable.filter(i => i.kind === 'theme').sort((a, b) => tierOf(a.id) - tierOf(b.id) || a.price - b.price || (a.sort ?? 0) - (b.sort ?? 0))
  const banners = sellable.filter(i => i.kind === 'banner')
  const frames = sellable.filter(i => i.kind === 'frame')
  const timers = items.filter(i => i.kind === 'timer')
  const perks = items.filter(i => i.kind === 'perk')

  const tierItems = tier => themes.filter(i => (tier === 2 ? tierOf(i.id) === 2 : tierOf(i.id) < 2))
  const TABS = [
    { id: 'themes', label: 'Themes', icon: '🎨', show: true },
    { id: 'style', label: 'Style packs', icon: '✨', show: tierItems(2).length > 0 },
    { id: 'banner', label: 'Banners', icon: '🏞️', show: banners.length > 0 },
    { id: 'frame', label: 'Frames', icon: '🖼️', show: frames.length > 0 },
    { id: 'timer', label: 'Timer styles', icon: '⏳', show: timers.length > 0 || bundles.length > 0 },
    { id: 'perk', label: 'Perks', icon: '🎁', show: perks.length > 0 },
    { id: 'how', label: 'How XP & coins work', icon: '💡', show: true },
  ].filter(t => t.show)
  const active = TABS.some(t => t.id === tab) ? tab : 'themes'
  const list = tierItems(active === 'style' ? 2 : 0)

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
          <p className="muted">Spend coins on how your page looks. Pick a category below. Coins come from XP, and spending them never lowers your level.</p>
        </div>
        <div className="balance" aria-label={`${balance} coins`}>
          <span className="balance-coin"><Coin size="1.4rem" /></span>
          <strong>{balance.toLocaleString()}</strong>
          <small>coins</small>
        </div>
      </header>

      <nav className="card shop-tabs" role="tablist" aria-label="Shop categories">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={active === t.id} className={'shop-tab' + (active === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      {active === 'how' && <XpCoinGuide xp={xp} level={level} balance={balance} />}

      {(active === 'themes' || active === 'style') && (
      <section className="card">
        <h2>{active === 'style' ? 'Style packs' : 'Themes'}</h2>
        {active === 'style' && <p className="muted small">Goes further than a theme: every box, button and text field is reshaped (not just recoloured), and each pack brings its own sounds and its own background music. Its own dock too.</p>}
        <div className="themes">
          {active === 'themes' && <>
          <div className={'theme-opt shop-card' + (theme === 'default' ? ' on' : '')} data-t="default">
            <Swatch id="default" colors={themeById.default.preview} />
            <strong>Classic</strong>
            <small>{themeById.default.blurb}</small>
            {theme === 'default'
              ? <span className="owned">✓ Equipped</span>
              : <button className="secondary" onClick={() => setTheme('default')}>Equip</button>}
          </div>

          <div className={'theme-opt shop-card' + (theme === 'dark' ? ' on' : '')} data-t="dark">
            <Swatch id="dark" colors={themeById.dark.preview} />
            <strong>Classic Dark</strong>
            <small>{themeById.dark.blurb}</small>
            {theme === 'dark'
              ? <span className="owned">✓ Equipped</span>
              : <button className="secondary" onClick={() => setTheme('dark')}>Equip</button>}
          </div>

          {['gordon', 'stonybrook', 'umaine'].map(id => (
            <div key={id} className={'theme-opt shop-card' + (theme === id ? ' on' : '')} data-t={id}>
              <Swatch id={id} colors={themeById[id].preview} />
              <strong>{themeById[id].name}</strong>
              <small>{themeById[id].blurb}</small>
              {theme === id
                ? <span className="owned">✓ Equipped</span>
                : <button className="secondary" onClick={() => setTheme(id)}>Equip</button>}
            </div>
          ))}
          </>}

          {list.map(item => {
            const t = themeById[item.id]
            const has = owned.has(item.id)
            const short = item.price - balance
            const tier = tierOf(item.id)
            const first = list.findIndex(x => tierOf(x.id) === tier) === list.indexOf(item)
            return (
              <Fragment key={item.id}>
              {first && tier === 1 && (
                <div className="shop-tier">
                  <h3>{tier === 1 ? 'Signature themes' : 'Style packs'}</h3>
                  <p className="muted small">{tier === 1
                    ? 'A theme with its own dock: the side buttons change shape. The boxes themselves stay the same.'
                    : 'Goes further than a theme: every box, button and text field is reshaped (not just recoloured), and it brings its own sounds and its own background music. Its own dock too.'}</p>
                </div>
              )}
              <div className={'theme-opt shop-card' + (theme === item.id ? ' on' : '')} data-t={item.id}>
                <Swatch id={item.id} colors={t.preview} />
                <strong>{item.name}</strong>
                <small>{t.blurb}</small>
                {t.style && (
                  <ul className="style-includes" aria-label="What a Style pack includes">
                    <li>Every box reshaped</li><li>Buttons &amp; fields too</li><li>Own sound pack</li><li>Own music</li>
                  </ul>
                )}
                {t.signature && <span className="sig-chip">✦ Signature dock: {t.signature}</span>}
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
                    {busy === item.id ? 'Buying…' : <><Coin /> {item.price}</>}
                    {short > 0 && <small className="need"> need {short} more</small>}
                  </button>
                )}
              </div>
              </Fragment>
            )
          })}
        </div>
        {list.length === 0 && active === 'style' && <p className="muted">The shop is empty right now.</p>}
      </section>
      )}

      {active === 'timer' && bundles.length > 0 && (
        <section className="card">
          <h2>Timer bundles <small>buy styles together for less. Every style works for Pomodoro and Count up.</small></h2>
          <div className="themes">
            {bundles.map(b => {
              const parts = b.items.map(id => items.find(i => i.id === id)).filter(Boolean)
              const missing = parts.filter(i => !owned.has(i.id))
              const separately = parts.reduce((n, i) => n + i.price, 0)
              const cost = missing.length === 0 ? 0 : Math.ceil(b.price * missing.length / Math.max(1, b.items.length))
              const short = cost - balance
              return (
                <div key={b.id} className="theme-opt shop-card bundle-card">
                  <span className="bundle-thumbs" aria-hidden="true">
                    {parts.map(i => (
                      <span key={i.id} className="timer-thumb"><TimerFace styleId={i.id.replace('timer-', '')} left={600000} total={1500000} mode="focus" running={false} small /></span>
                    ))}
                  </span>
                  <strong>{b.name}</strong>
                  <small>{b.blurb}</small>
                  <small className="muted">{parts.map(i => i.name).join(', ')}</small>
                  {missing.length === 0
                    ? <span className="owned">✓ You own all of these</span>
                    : (
                      <>
                        <small className="bundle-save">Separately <Coin /> {missing.reduce((n, i) => n + i.price, 0)}, together <Coin /> {cost}</small>
                        <button onClick={() => run(b.id, buyBundle, `You bought the ${b.name}!`)} disabled={short > 0 || !!busy}
                          title={short > 0 ? `You need ${short} more coins` : ''}>
                          {busy === b.id ? 'Buying…' : <>Buy bundle · <Coin /> {cost}</>}
                          {short > 0 && <small className="need"> need {short} more</small>}
                        </button>
                      </>
                    )}
                </div>
              )
            })}
          </div>
          <p className="muted small">Own some of a bundle already? You only pay for the rest.</p>
        </section>
      )}

      {[['Banners', banners, 'banner'], ['Frames', frames, 'frame'], ['Timer styles', timers, 'timer'], ['Profile perks', perks, 'perk']].map(([title, list, kind]) => list.length > 0 && active === kind && (
        <section className="card" key={kind}>
          <h2>{title} <small>{kind === 'timer' ? 'for the Study timer' : kind === 'perk' ? 'unlock once, keep forever' : 'show on your profile'}</small></h2>
          <div className="themes">
            {list.map(item => {
              const has = owned.has(item.id)
              const short = item.price - balance
              return (
                <div key={item.id} className="theme-opt shop-card">
                  {kind === 'timer'
                    ? <span className="timer-thumb" aria-hidden="true"><TimerFace styleId={item.id.replace('timer-', '')} left={600000} total={1500000} mode="focus" running={false} small /></span>
                    : kind === 'frame' ? <span className="shop-frame-thumb"><FramePreview id={item.id} size={64} /></span>
                    : kind === 'perk' ? <span className="perk-thumb" aria-hidden="true"><i>GIF</i></span>
                    : <span className={'swatch-preview shop-' + kind + ' ' + item.id} aria-hidden="true" />}
                  <strong>{item.name}</strong>
                  {has
                    ? <span className="owned">✓ Owned {kind === 'timer' ? <Link to="/study" className="small">Use it on Study</Link> : kind === 'perk' ? <Link to="/profile" className="small">{item.id === 'perk-gif-banner' ? 'Add a banner picture on your profile' : 'Upload a GIF on your profile'}</Link> : <Link to="/profile" className="small">Equip on your profile</Link>}</span>
                    : (
                      <button onClick={() => purchase(item.id, item.name)} disabled={short > 0 || !!busy}
                        title={short > 0 ? `You need ${short} more coins` : ''}>
                        {busy === item.id ? 'Buying…' : <><Coin /> {item.price}</>}
                        {short > 0 && <small className="need"> need {short} more</small>}
                      </button>
                    )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
