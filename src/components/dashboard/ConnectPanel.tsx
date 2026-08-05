import { useState } from 'react'
import { useActiveProject } from '@/hooks/useProjects'
import { useIntegrations, useDeleteIntegration } from '@/hooks/useIntegrations'
import { IntegrationConfigModal } from '@/components/integrations/IntegrationConfigModal'
import { toast } from 'sonner'

import shopifyLogo from '@/assets/shopify-logo-new.png'
import wordpressLogo from '@/assets/wordpress-logo-new.png'
import bigcommerceLogo from '@/assets/bigcommerce-logo.png'
import framerLogo from '@/assets/framer-logo.png'
import wixLogo from '@/assets/wix-logo.png'

/** Platforms we can publish to. Same ids the edge functions expect. */
const PLATFORMS = [
  { id: 'wordpress', name: 'WordPress', icon: wordpressLogo, isImage: true },
  { id: 'shopify', name: 'Shopify', icon: shopifyLogo, isImage: true },
  { id: 'wix', name: 'Wix', icon: wixLogo, isImage: true },
  { id: 'framer', name: 'Framer', icon: framerLogo, isImage: true },
  { id: 'bigcommerce', name: 'BigCommerce', icon: bigcommerceLogo, isImage: true },
  { id: 'webflow', name: 'Webflow', icon: '🔷', isImage: false },
  { id: 'api', name: 'API', icon: '⚙️', isImage: false },
  { id: 'webhook', name: 'Webhook', icon: '🔗', isImage: false },
] as const

interface ConnectPanelProps {
  onClose: () => void
}

/**
 * Picking and configuring a CMS, inside the dashboard. Opens the existing
 * IntegrationConfigModal rather than sending people to the legacy page.
 */
export function ConnectPanel({ onClose }: ConnectPanelProps) {
  const { project } = useActiveProject()
  const { data: integrations = [], refetch } = useIntegrations()
  const deleteIntegration = useDeleteIntegration()
  const [platform, setPlatform] = useState<string | null>(null)

  const connectedFor = (id: string) => integrations.find((i) => i.platform === id && i.is_connected)
  const current = platform ? connectedFor(platform) : undefined

  const disconnect = async (integrationId: string, name: string) => {
    try {
      await deleteIntegration.mutateAsync(integrationId)
      toast.success(`${name} disconnected`)
      refetch()
    } catch {
      toast.error(`Could not disconnect ${name}`)
    }
  }

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-head">
        <div>
          <h2>Connect your website</h2>
          <p className="sub">Pick where your content should publish. Nothing goes live until one is linked.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Done</button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '10px',
          marginTop: '4px',
        }}
      >
        {PLATFORMS.map((p) => {
          const connected = connectedFor(p.id)
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 14px',
                borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%',
                fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 600,
                border: connected ? '1.5px solid var(--green)' : '1px solid var(--line)',
                background: connected ? 'var(--green-soft)' : 'var(--surface)',
                color: 'var(--ink)',
              }}
            >
              {p.isImage ? (
                <img src={p.icon as string} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <span style={{ fontSize: 19, flexShrink: 0 }}>{p.icon as string}</span>
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                {p.name}
                {connected && (
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--green)' }}>
                    Connected
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {integrations.filter((i) => i.is_connected).length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: '22px' }}>Connected</div>
          {integrations
            .filter((i) => i.is_connected)
            .map((i) => (
              <div className="setting-row" key={i.id}>
                <div className="setting-l">
                  <div>
                    <div className="setting-name">
                      {PLATFORMS.find((p) => p.id === i.platform)?.name || i.platform}
                    </div>
                    <div className="setting-meta">{i.config?.url || i.config?.name || 'Publishing enabled'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPlatform(i.platform)}>Edit</button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', borderColor: '#f1cccc' }}
                    onClick={() => disconnect(i.id, i.platform)}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
        </>
      )}

      {project && (
        <IntegrationConfigModal
          open={!!platform}
          onOpenChange={(open) => !open && setPlatform(null)}
          platform={platform}
          projectId={project.id}
          existingConfig={current?.config}
          integrationId={current?.id}
          onSuccess={() => {
            setPlatform(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
