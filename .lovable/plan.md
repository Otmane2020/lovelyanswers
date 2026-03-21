

## Analyse

Les emails sont deja envoyes depuis `support@autopilotgeo.com` via Resend (API key configuree). Le domaine est deja correct dans les 3 edge functions qui envoient des emails:
- `send-email/index.ts` — FROM: `AutoPilot Geo <support@autopilotgeo.com>`
- `db-email-trigger/index.ts` — FROM: `AutoPilot Geo <support@autopilotgeo.com>`
- `abandoned-cart-emails/index.ts` — FROM: `AutoPilot Geo <support@autopilotgeo.com>`

Le domaine d'envoi est donc deja `autopilotgeo.com`. Aucun changement de domaine necessaire.

## Plan — Ajouter un bouton "Envoyer un email test"

### 1. Ajouter un type "test" dans l'edge function `send-email`
Ajouter un cas `test` dans le switch qui envoie un email de test simple et professionnel avec le branding AutoPilot Geo.

**Fichier:** `supabase/functions/send-email/index.ts`
- Ajouter `"test"` au type union de `EmailRequest`
- Ajouter un case `test` qui genere un email simple: "Ceci est un email test depuis AutoPilot Geo. Si vous recevez cet email, votre configuration fonctionne correctement."

### 2. Ajouter un bouton "Envoyer email test" dans le panneau admin/settings
Ajouter un bouton dans la page settings ou super-admin qui permet d'envoyer un email test a l'adresse de l'utilisateur connecte.

**Fichier:** `src/views/AeoSettings.tsx` (ou `src/views/SuperAdmin.tsx`)
- Bouton "Envoyer un email test"
- Appelle `supabase.functions.invoke("send-email", { body: { type: "test", to: userEmail } })`
- Affiche toast succes/erreur

### 3. Deployer l'edge function mise a jour

### Detail technique
- L'email test sera envoye depuis `support@autopilotgeo.com` via Resend
- Le domaine `autopilotgeo.com` doit etre verifie dans Resend pour que les emails arrivent (si ce n'est pas deja fait, ils tomberont en spam ou seront rejetes)
- Le `RESEND_API_KEY` est deja configure dans les secrets

