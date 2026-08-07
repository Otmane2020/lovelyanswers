import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveProject } from '@/hooks/useProjects'

interface SupportModalProps {
  onClose: () => void
}

export function SupportModal({ onClose }: SupportModalProps) {
  const { user } = useAuth()
  const { project } = useActiveProject()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!message.trim()) {
      toast.error('Write your message first')
      return
    }
    setSending(true)
    try {
      const brandName = project?.brand_name || project?.name || 'their project'
      const html = `
        <p><b>Help request</b> from the dashboard.</p>
        <ul>
          <li><b>Account:</b> ${user?.email || 'unknown'}</li>
          <li><b>Project:</b> ${brandName}</li>
        </ul>
        <p><b>Message:</b><br>${message.replace(/\n/g, '<br>')}</p>
      `
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom',
          to: 'support@autopilotgeo.com',
          subject: `Help request — ${brandName}`,
          html,
        },
      })
      if (error) throw error
      setSent(true)
    } catch {
      toast.error('Could not send your message — try emailing support@autopilotgeo.com directly')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,22,46,.5)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 420, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-head">
          <div>
            <h2>Need help?</h2>
            <p className="sub">Send a message to the AutoPilot GEO team — we reply by email, usually within a day.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        {sent ? (
          <div style={{ padding: '16px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Message sent</div>
            <p className="sub" style={{ margin: 0 }}>We'll get back to you at {user?.email}.</p>
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="What's going on? The more detail, the faster we can help."
              style={{
                width: '100%', padding: '10px 12px', fontSize: 13.5, fontFamily: 'inherit',
                border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface)',
                color: 'var(--ink)', marginBottom: 14, boxSizing: 'border-box', resize: 'vertical',
              }}
            />
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={sending} onClick={submit}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
            <p className="sub" style={{ textAlign: 'center', marginTop: 10, marginBottom: 0, fontSize: 11.5 }}>
              Prefer email? support@autopilotgeo.com
            </p>
          </>
        )}
      </div>
    </div>
  )
}
