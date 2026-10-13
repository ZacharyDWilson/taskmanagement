import { createContext, useCallback, useContext, useState } from 'react'
import { useSound } from './sfx.jsx'

const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

// Small pop-up messages ("+10 XP", "Jordan is open to study") that fade away on their own.
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const { play } = useSound()

  const toast = useCallback((message, kind = 'info') => {
    play(kind === 'level' ? 'success' : kind === 'xp' ? 'check' : 'info')
    const id = `${Date.now()}-${Math.random()}`
    setItems(list => [...list, { id, message, kind }])
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), kind === 'level' ? 6000 : 4000)
  }, [play])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => <div key={t.id} className={'toast ' + t.kind}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  )
}
