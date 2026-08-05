import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveProject } from '@/hooks/useProjects'
import { useIntegrations } from '@/hooks/useIntegrations'
import { useSubscription } from '@/hooks/useSubscription'
import { useGoogleBusiness } from '@/hooks/useGoogleBusiness'
import { IconGlobe, IconPin, IconCart, IconUser, IconCard } from './Icons'

const CMS_PLATFORMS = ['wordpress', 'shopify', 'webflow', 'wix', 'bigcommerce', 'framer', 'custom']

const PLATFORM_LABEL: Record<string, string> = {
  wordpress: 'WordPress',
  shopify: 'Shopify',
  webflow: 'Webflow',
  wix: 'Wix',
  bigcommerce: 'BigCommerce',
  framer: 'Framer',
  google_business: 'Google Business Profile',
  google_search_console: 'Google Search Console',
}

export function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { project } = useActiveProject()
  const { data: integrations = [], isLoading } = useIntegrations()
  const { subscribed, trial, subscriptionEnd, creditsTotal, isLoading: subLoading, startCheckout, openCustomerPortal } =
    useSubscription()
  const { isConnected: gmbConnected, connectGMB } = useGoogleBusiness()

  const cms = integrations.find((i) => CMS_PLATFORMS.includes(i.platform) && i.is_connected)
  const catalog = integrations.find((i) => ['shopify', 'bigcommerce'].includes(i.platform) && i.is_connected)

  const planLabel = subLoading
    ? 'Checking…'
    : subscribed
    ? trial
      ? 'Free trial — active'
      : 'Active subscription'
    : 'No active plan'

  const planMeta = subLoading
    ? ''
    : subscriptionEnd
    ? `${trial ? 'Trial ends' : 'Renews'} ${new Date(subscriptionEnd).toLocaleDateString()}${
        creditsTotal ? ` · ${creditsTotal} credits` : ''
      }`
    : 'Start a plan to keep publishing daily'

  const handleBilling = async () => {
    try {
      if (subscribed) await openCustomerPortal()
      else await startCheckout()
    } catch {
      toast.error('Could not open billing. Please try again.')
    }
  }

  return (
    <section>
      <div className="top-header">
        <h1>Settings</h1>
        <p>Connections, access and billing</p>
      </div>

      <div className="section-label">Connections</div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo"><IconGlobe /></div>
            <div>
              <div className="setting-name">Website (CMS)</div>
              <div className="setting-meta">
                {isLoading
                  ? 'Checking…'
                  : cms
                  ? `${PLATFORM_LABEL[cms.platform] || cms.platform} — publishing enabled`
                  : 'Required to publish automatically'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {cms ? (
              <span className="badge-connected">Connected</span>
            ) : (
              <>
                <span className="badge-missing">Not connected</span>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/integrations')}>
                  Connect
                </button>
              </>
            )}
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo"><IconPin /></div>
            <div>
              <div className="setting-name">Google Business Profile</div>
              <div className="setting-meta">Business listing and reviews</div>
            </div>
          </div>
          {gmbConnected ? (
            <span className="badge-connected">Connected</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge-missing">Not connected</span>
              <button className="btn btn-primary btn-sm" onClick={() => connectGMB()}>Connect</button>
            </div>
          )}
        </div>

        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo"><IconCart /></div>
            <div>
              <div className="setting-name">Product catalog</div>
              <div className="setting-meta">
                {catalog ? `${PLATFORM_LABEL[catalog.platform] || catalog.platform} — synced` : 'Optional — for product pages'}
              </div>
            </div>
          </div>
          {catalog ? (
            <span className="badge-connected">Connected</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge-missing">Not connected</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/integrations')}>Connect</button>
            </div>
          )}
        </div>
      </div>

      <div className="section-label">Project</div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo"><IconGlobe /></div>
            <div>
              <div className="setting-name">{project?.brand_name || project?.name || 'Your project'}</div>
              <div className="setting-meta">{project?.website_url || 'No website set'}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}>Edit</button>
        </div>
      </div>

      <div className="section-label">Account</div>
      <div className="card">
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo"><IconUser /></div>
            <div>
              <div className="setting-name">
                {(user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || 'Your account'}
              </div>
              <div className="setting-meta">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/account')}>Edit</button>
        </div>

        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo"><IconCard /></div>
            <div>
              <div className="setting-name">{planLabel}</div>
              <div className="setting-meta">{planMeta}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" disabled={subLoading} onClick={handleBilling}>
            {subscribed ? 'Manage' : 'Upgrade'}
          </button>
        </div>
      </div>
    </section>
  )
}
