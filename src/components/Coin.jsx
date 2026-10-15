// A drawn gold coin. The coin emoji does not exist on older Windows, where it shows as a broken box.
export default function Coin({ size = '1.05em' }) {
  return (
    <svg className="coin-svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.5" fill="#f2b632" stroke="#b97a0c" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.2" fill="#ffd861" stroke="#d79a1f" strokeWidth="1" />
      <path d="M12 7.4v9.2M14.4 9.6c-.5-.8-1.4-1.1-2.4-1.1-1.4 0-2.3.7-2.3 1.7 0 2.3 4.8 1.1 4.8 3.4 0 1-1 1.8-2.5 1.8-1.1 0-2.1-.4-2.6-1.3"
        fill="none" stroke="#a96a05" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
