# Informations a nous fournir pour finaliser votre plateforme

Bonjour,

Pour finaliser la configuration de votre plateforme Sales System, nous avons besoin de quelques informations de votre part. Rien de complique — on vous explique tout ci-dessous.

Remplissez ce qui vous concerne et renvoyez-nous ce document.

---

## 1. Votre identite / branding

| Information                                                  | Votre reponse       |
| ------------------------------------------------------------ | ------------------- |
| Nom de votre entreprise                                      |                     |
| Votre nom complet                                            |                     |
| Email principal (pour le compte admin)                       |                     |
| Mot de passe souhaite (min. 8 caracteres)                    |                     |
| Logo (fichier PNG ou SVG)                                    | A joindre par email |
| Couleur principale de votre marque (ex: #FF5500)             |                     |
| Nom de domaine personnalise souhaite (ex: app.votresite.com) |                     |

---

## 2. Paiements — Stripe

Pour que vos clients puissent payer en ligne (contrats, abonnements), nous avons besoin de votre compte Stripe.

**Si vous avez deja un compte Stripe :**

- Connectez-vous sur https://dashboard.stripe.com
- Allez dans Developpeurs > Cles API
- Copiez la **cle secrete** (commence par `sk_live_...`)

**Si vous n'avez pas de compte :** Creez-en un gratuitement sur https://stripe.com — c'est rapide (5 min).

| Information                        | Votre reponse |
| ---------------------------------- | ------------- |
| Cle secrete Stripe (`sk_live_...`) |               |

---

## 3. Emails — Resend

Pour que la plateforme puisse envoyer des emails en votre nom (relances, confirmations, notifications).

**Etapes :**

1. Creez un compte gratuit sur https://resend.com (100 emails/jour offerts)
2. Allez dans API Keys > Create API Key
3. Copiez la cle (commence par `re_...`)

| Information                                                       | Votre reponse |
| ----------------------------------------------------------------- | ------------- |
| Cle API Resend (`re_...`)                                         |               |
| Adresse email d'envoi souhaitee (ex: contact@votreentreprise.com) |               |
| Nom d'expediteur souhaite (ex: "Equipe Damien Reynaud")           |               |

> **Note :** Pour envoyer depuis votre propre adresse email (pas `@resend.dev`), il faudra verifier votre nom de domaine dans Resend. On vous guidera si besoin.

---

## 4. Intelligence Artificielle — OpenRouter

L'IA est utilisee pour : le coach IA, la generation de messages de relance, les scripts de prospection.

**Etapes :**

1. Creez un compte sur https://openrouter.ai (gratuit)
2. Allez dans Keys > Create Key
3. Copiez la cle (commence par `sk-or-...`)
4. Ajoutez du credit (5 a 10€ suffisent pour commencer)

| Information                      | Votre reponse |
| -------------------------------- | ------------- |
| Cle API OpenRouter (`sk-or-...`) |               |

---

## 5. WhatsApp (optionnel)

Si vous souhaitez envoyer des messages WhatsApp a vos prospects depuis la plateforme.

**Prerequis :** Un compte Meta Business verifie (la verification peut prendre quelques jours).

**Etapes :**

1. Allez sur https://developers.facebook.com
2. Creez une app de type "Business"
3. Ajoutez le produit "WhatsApp"
4. Recuperez le token d'acces et l'ID du numero

| Information                        | Votre reponse |
| ---------------------------------- | ------------- |
| Token d'acces WhatsApp (`EAA...`)  |               |
| ID du numero de telephone WhatsApp |               |
| Numero de telephone utilise        |               |

> Si c'est trop complique, dites-le nous et on vous accompagne sur cette etape.

---

## 6. Instagram (optionnel)

Si vous souhaitez envoyer des DM Instagram depuis la plateforme.

**Prerequis :** Un compte Instagram Professionnel (pas personnel).

| Information                        | Votre reponse |
| ---------------------------------- | ------------- |
| Nom d'utilisateur Instagram (@...) |               |
| Token d'acces Instagram (`IGQ...`) |               |

> Si vous ne savez pas comment obtenir le token, donnez-nous simplement votre nom d'utilisateur et on s'en occupe.

---

## 7. LinkedIn (optionnel)

Si vous souhaitez envoyer des messages LinkedIn depuis la plateforme.

| Information                       | Votre reponse |
| --------------------------------- | ------------- |
| URL de votre profil LinkedIn      |               |
| Token d'acces LinkedIn (`AQV...`) |               |

> Meme chose : si c'est trop technique, donnez-nous juste votre profil LinkedIn.

---

## 8. Google Calendar (optionnel)

Si vous souhaitez synchroniser vos rendez-vous avec Google Calendar.

| Information                               | Votre reponse |
| ----------------------------------------- | ------------- |
| Adresse Gmail utilisee pour le calendrier |               |

---

## 9. Votre equipe

Listez les personnes qui auront acces a la plateforme :

| Nom complet | Email | Role souhaite             |
| ----------- | ----- | ------------------------- |
| (vous)      |       | Admin                     |
|             |       | Manager / Setter / Closer |
|             |       | Manager / Setter / Closer |
|             |       | Manager / Setter / Closer |

**Les roles disponibles :**

- **Admin** — Acces total, peut tout configurer
- **Manager** — Gere l'equipe et voit tous les deals
- **Setter** — Prospecte et prend les rendez-vous
- **Closer** — Fait les appels de closing et cree les contrats

---

## 10. Contenu initial (optionnel)

Si vous avez deja des donnees a importer :

| Donnee                        | Format accepte       |
| ----------------------------- | -------------------- |
| Liste de contacts / prospects | Excel (.xlsx) ou CSV |
| Scripts de vente existants    | Word ou PDF          |
| Modeles de contrats           | Word ou PDF          |
| Logo haute resolution         | PNG ou SVG           |

---

## Recapitulatif — Ce qui est obligatoire vs optionnel

| Element             | Obligatoire ?                               |
| ------------------- | ------------------------------------------- |
| Identite / branding | **Oui**                                     |
| Stripe (paiements)  | **Oui** si vous vendez en ligne             |
| Resend (emails)     | **Oui** — necessaire pour les notifications |
| OpenRouter (IA)     | **Recommande** — sinon pas d'IA             |
| WhatsApp            | Optionnel                                   |
| Instagram           | Optionnel                                   |
| LinkedIn            | Optionnel                                   |
| Google Calendar     | Optionnel                                   |
| Equipe              | Quand vous etes pret                        |

---

**Renvoyez ce document rempli par email. On s'occupe du reste !**

Pour les cles API : ne vous inquietez pas si certaines etapes vous semblent compliquees. Indiquez simplement ce que vous avez reussi a faire, et on vous guidera pour le reste.
