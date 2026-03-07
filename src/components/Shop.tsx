import { useState } from 'react'
import type { UseCosmeticsStateReturn } from '../hooks/useCosmeticsState'
import { BACKGROUNDS, BLOCK_THEMES } from '../data/cosmetics'
import '../styles/shop.css'

interface ConfirmState {
  kind: 'background' | 'theme'
  id: string
  name: string
  price: number
}

interface ShopProps {
  cosmetics: UseCosmeticsStateReturn
  onClose: () => void
  onPurchaseSuccess: (name: string) => void
}

export default function Shop({ cosmetics, onClose, onPurchaseSuccess }: ShopProps) {
  const { state, purchase, equip } = cosmetics
  const [tab, setTab] = useState<'backgrounds' | 'themes'>('backgrounds')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  function handleBuy(kind: 'background' | 'theme', id: string, name: string, price: number) {
    if (price === 0) {
      // Free items can be equipped directly
      equip(kind, id)
      return
    }
    setConfirm({ kind, id, name, price })
  }

  function handleConfirmBuy() {
    if (!confirm) return
    const success = purchase(confirm.kind, confirm.id)
    if (success) {
      equip(confirm.kind, confirm.id)
      onPurchaseSuccess(confirm.name)
    }
    setConfirm(null)
  }

  return (
    <>
      <div
        className="shop-overlay"
        onClick={onClose}
        data-testid="shop-overlay"
      >
        <div
          className="shop-modal"
          onClick={e => e.stopPropagation()}
          data-testid="shop-modal"
        >
          {/* Header */}
          <div className="shop-header">
            <h2 className="shop-title">🎨 Shop</h2>
            <span className="shop-gem-count" data-testid="shop-gem-count">💎 {state.gems}</span>
            <button
              className="shop-close"
              onClick={onClose}
              aria-label="Close shop"
              data-testid="shop-close"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="shop-tabs">
            <button
              className={`shop-tab${tab === 'backgrounds' ? ' active' : ''}`}
              onClick={() => setTab('backgrounds')}
              data-testid="tab-backgrounds"
            >
              🖼 Backgrounds
            </button>
            <button
              className={`shop-tab${tab === 'themes' ? ' active' : ''}`}
              onClick={() => setTab('themes')}
              data-testid="tab-themes"
            >
              🎨 Themes
            </button>
          </div>

          {/* Content */}
          <div className="shop-content">
            {tab === 'backgrounds' ? (
              <div className="shop-grid" data-testid="backgrounds-grid">
                {BACKGROUNDS.map(bg => {
                  const owned = state.purchasedBackgrounds.includes(bg.id)
                  const active = state.activeBackground === bg.id
                  const canAfford = state.gems >= bg.price

                  return (
                    <div
                      key={bg.id}
                      className={`shop-item${active ? ' active-item' : ''}`}
                      data-testid={`shop-item-${bg.id}`}
                    >
                      {/* Thumbnail */}
                      <div className="shop-bg-thumb">
                        {bg.id === 'default' ? (
                          <div className="shop-bg-thumb-default" />
                        ) : (
                          <img
                            className="shop-bg-thumb-img"
                            src={`${import.meta.env.BASE_URL}backgrounds/${bg.filename}`}
                            alt={bg.name}
                            onError={e => {
                              const el = e.currentTarget as HTMLImageElement
                              el.style.display = 'none'
                              const parent = el.parentElement
                              if (parent && !parent.querySelector('.shop-bg-missing')) {
                                const placeholder = document.createElement('div')
                                placeholder.className = 'shop-bg-missing'
                                placeholder.textContent = '🖼'
                                parent.appendChild(placeholder)
                              }
                            }}
                          />
                        )}
                      </div>

                      <div className="shop-item-info">
                        <div className="shop-item-name">{bg.name}</div>
                        <div className={`shop-item-price${bg.price === 0 ? ' free' : ''}`}>
                          {bg.price === 0 ? 'Free' : `${bg.price} 💎`}
                        </div>
                      </div>

                      {active ? (
                        <button className="shop-item-btn active-btn" disabled>
                          ✓ Active
                        </button>
                      ) : owned ? (
                        <button
                          className="shop-item-btn equip-btn"
                          onClick={() => equip('background', bg.id)}
                          data-testid={`equip-bg-${bg.id}`}
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          className="shop-item-btn buy-btn"
                          onClick={() => handleBuy('background', bg.id, bg.name, bg.price)}
                          disabled={!canAfford}
                          data-testid={`buy-bg-${bg.id}`}
                        >
                          {canAfford ? `Buy ${bg.price} 💎` : `${bg.price} 💎`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="shop-grid" data-testid="themes-grid">
                {BLOCK_THEMES.map(theme => {
                  const owned = state.purchasedThemes.includes(theme.id)
                  const active = state.activeTheme === theme.id
                  const canAfford = state.gems >= theme.price

                  return (
                    <div
                      key={theme.id}
                      className={`shop-item${active ? ' active-item' : ''}${theme.premium ? ' premium-item' : ''}`}
                      data-testid={`shop-item-${theme.id}`}
                    >
                      {/* Theme preview — 3 styled slot boxes */}
                      <div
                        className="shop-theme-preview"
                        style={{
                          background: theme.vars['--theme-slot-bg'],
                        }}
                      >
                        {[false, true, false].map((found, i) => (
                          <div
                            key={i}
                            className={`shop-theme-slot${found ? ' shop-theme-slot-found' : ''}`}
                            style={{
                              '--preview-bg': found
                                ? theme.vars['--theme-slot-found-bg']
                                : theme.vars['--theme-slot-bg'],
                              '--preview-found-bg': theme.vars['--theme-slot-found-bg'],
                              '--preview-border': theme.vars['--theme-slot-border'],
                            } as React.CSSProperties}
                          />
                        ))}
                      </div>

                      <div className="shop-item-info">
                        <div className="shop-item-name">{theme.name}</div>
                        {theme.premium && (
                          <div className="shop-premium-badge">✦ Premium</div>
                        )}
                        <div className={`shop-item-price${theme.price === 0 ? ' free' : ''}`}>
                          {theme.price === 0 ? 'Free' : `${theme.price} 💎`}
                        </div>
                      </div>

                      {active ? (
                        <button className="shop-item-btn active-btn" disabled>
                          ✓ Active
                        </button>
                      ) : owned ? (
                        <button
                          className="shop-item-btn equip-btn"
                          onClick={() => equip('theme', theme.id)}
                          data-testid={`equip-theme-${theme.id}`}
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          className="shop-item-btn buy-btn"
                          onClick={() => handleBuy('theme', theme.id, theme.name, theme.price)}
                          disabled={!canAfford}
                          data-testid={`buy-theme-${theme.id}`}
                        >
                          {canAfford ? `Buy ${theme.price} 💎` : `${theme.price} 💎`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm purchase dialog */}
      {confirm && (
        <div
          className="shop-confirm-overlay"
          data-testid="shop-confirm"
        >
          <div className="shop-confirm-card">
            <h3>Confirm Purchase</h3>
            <p>Buy <strong>{confirm.name}</strong> for {confirm.price} 💎?</p>
            <div className="shop-confirm-actions">
              <button
                className="shop-confirm-cancel"
                onClick={() => setConfirm(null)}
                data-testid="confirm-cancel"
              >
                Cancel
              </button>
              <button
                className="shop-confirm-buy"
                onClick={handleConfirmBuy}
                data-testid="confirm-buy"
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
