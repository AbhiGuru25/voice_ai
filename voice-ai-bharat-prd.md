# Product Requirements Document
## Voice-First Agentic AI for Bharat (Tier 2/3 India)

**Version:** 1.0 (MVP)
**Owner:** Verve
**Date:** July 2026

---

## 1. Problem Statement

India's next 500 million internet users are in Tier 2/3 towns and rural areas. They own smartphones but are not comfortable typing — in English or often even in their own language. Every major digital service (government schemes, agri-market prices, healthcare booking, grievance redressal) assumes text/app literacy that this population doesn't have. Voice is their native interface, not text.

No product currently offers a **voice-first, multi-language, agentic** (i.e., action-taking, not just informational) AI layer for this population, distributed through the organizations that already reach them.

---

## 2. Goals

- **Primary goal:** Prove that a voice-first AI agent can understand a request in Hindi/Gujarati/English (mixed), take a real action on the user's behalf, and confirm completion — for one high-value use case.
- **Business goal:** Land 1 B2B2C pilot partner (NGO, agri-input company, or FPO) distributing this to real end users within 8-10 weeks.
- **Non-goal (for MVP):** Do not build all four use cases (mandi prices, govt schemes, clinic booking, grievances) at once. Do not build proprietary ASR/TTS models. Do not target direct consumer payment.

---

## 3. Target Users

| User | Context | Pain point |
|---|---|---|
| Small/marginal farmer | Feature phone or basic smartphone, low literacy | Doesn't know today's crop price, can't navigate apps |
| Rural shopkeeper / gig worker | Smartphone-comfortable, English-averse | Wants quick answers without typing/navigating menus |
| Distribution partner (B2B2C) | NGO, agri-input company, FPO, microfinance org | Wants to offer added value to their existing user base without building AI in-house |

---

## 4. MVP Scope: Mandi Price Voice Agent

**Why this wedge first:** Single clean government data source (Agmarknet), no sensitive personal data, no booking/transaction logic, immediate daily-use value, fastest path to a working demo.

### User story
> "As a farmer, I call a number or send a WhatsApp voice note asking for today's wheat price in my district, in my own language, and I get a spoken answer back within seconds — and can ask a follow-up like 'what about tomorrow' or 'compare to last week' without starting over."

### MVP feature list
1. Inbound voice call OR WhatsApp voice note entry point
2. Speech-to-text in Hindi, Gujarati, and English (including code-switching)
3. Intent extraction: crop name, location, time reference (today/yesterday/trend)
4. Live lookup against Agmarknet mandi price data
5. Natural-language response generation
6. Text-to-speech reply in the same language the user spoke
7. Basic conversation memory (follow-up questions in the same session)
8. Logging every interaction to a database for later analysis

### Agentic layer (v1.1, right after core MVP works)
9. Proactive follow-up: "Would you like me to alert you when wheat crosses ₹2,200?" → sets a recurring check via a scheduled job, calls user back or sends WhatsApp message when condition is met
10. Confirmation checkpoint: any action beyond "just answer" (like setting an alert) is voice-confirmed with the user before it's executed
11. Escalation: if the AI can't confidently answer, it logs the query and can hand off to a human/partner support line

---

## 5. Out of Scope for MVP (explicitly deferred)

- Government scheme eligibility matching
- Clinic/appointment booking
- Grievance filing and routing
- Payments or transactions of any kind
- Proprietary ASR/TTS model training
- Direct consumer monetization

---

## 6. System Architecture

```
User (voice call / WhatsApp voice note)
        |
        v
Speech-to-text (Bhashini / Google STT — Hindi, Gujarati, English)
        |
        v
AI intent engine (Claude or Groq — extracts crop, location, time, intent)
        |
        v
Agent orchestration layer (n8n)
   |-- Plan action
   |-- Confirm with user if action is sensitive (voice)
   |-- Execute (call Agmarknet API / set alert / etc.)
   |-- Verify outcome
   |-- Follow up or escalate if unresolved
        |
        v
Text-to-speech (same language as input)
        |
        v
Response delivered back via call or WhatsApp
```

**Data store:** Supabase (interaction logs, user sessions, alert subscriptions, language preference)
**Orchestration:** n8n (same pattern as existing Agent OS pipeline)
**Telephony:** Exotel or Knowlarity (India-focused, supports IVR + recording)
**Messaging:** WhatsApp Business API (already integrated in ClinicOS)
**AI:** Claude (intent parsing, response generation) + Groq (low-latency fallback for simple queries)
**ASR/TTS:** Bhashini (government-backed, purpose-built for Indian languages) as primary, Google Speech-to-Text/Text-to-Speech as fallback

---

## 7. Success Metrics (MVP phase)

| Metric | Target |
|---|---|
| End-to-end latency (voice question → voice answer) | Under 8 seconds |
| Intent recognition accuracy (crop + location correctly parsed) | 85%+ |
| Successful query resolution rate (no human escalation needed) | 80%+ |
| Pilot partner signed | 1, within 10 weeks |
| Real end-user test calls completed | 100+ during pilot |

---

## 8. Build Timeline (solo founder, realistic)

| Phase | Duration | Deliverable |
|---|---|---|
| 1. Voice pipeline proof-of-concept | Week 1-2 | Call in, speak a crop name, hear today's price back |
| 2. Multi-language reliability | Week 3-5 | Handles Gujarati/Hindi/English mixing, various accents |
| 3. WhatsApp channel + n8n orchestration | Week 6-7 | Same flow via WhatsApp voice notes, logging in place |
| 4. Agentic layer (alerts + confirmation) | Week 8-9 | Proactive price alerts with voice confirmation |
| 5. Pilot partner outreach & onboarding | Week 8-10 (parallel) | 1 signed pilot, first 100 real user calls |

---

## 9. Monetization Model

- **Not** direct-to-farmer pricing at MVP stage.
- **B2B2C:** charge distribution partners (agri-input companies, NGOs, FPOs, microfinance orgs) a per-active-user or flat platform fee to offer this to their existing base.
- **Future (post-MVP, multi-sector):** government partnership/procurement once track record exists (longer sales cycle, higher value contracts).

---

## 10. Key Risks

| Risk | Mitigation |
|---|---|
| ASR accuracy for regional accents/dialects is genuinely hard | Start with Bhashini + Google as dual providers, measure accuracy per language before committing, keep human escalation path always available |
| Trust-building with first-time voice-AI users takes real field time | Partner with an org that already has trust with end users (NGO/FPO) rather than going direct |
| Agentic actions (alerts, future bookings) increase liability if wrong | Every sensitive action requires explicit voice confirmation before execution; log everything |
| Solo founder bandwidth | Strictly one use case (mandi prices) until it works end-to-end before adding scope |

---

## 11. Tech Stack Summary (reusing existing Zynteq infrastructure)

- **Frontend/dashboard (internal monitoring):** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend/DB:** Supabase (Postgres, auth, RLS)
- **Automation/orchestration:** n8n
- **AI:** Claude API, Groq (LLaMA)
- **Voice:** Bhashini API, Google Speech-to-Text/Text-to-Speech (fallback)
- **Telephony:** Exotel or Knowlarity
- **Messaging:** WhatsApp Business API
- **Data source:** Agmarknet (government mandi price data)
- **Deployment:** Vercel (dashboard), n8n cloud or self-hosted (workflow engine)

---

## 12. Next Steps

1. Register for Bhashini API access and Agmarknet data access
2. Build the voice pipeline proof-of-concept (Phase 1) as a standalone test — no UI needed yet, just a working call-in-and-hear-a-price loop
3. Identify 3-5 candidate pilot partners (agri-input companies or FPOs in Gujarat) to approach once Phase 1-2 are working
4. Set up Supabase schema for interaction logs, alert subscriptions, and user language preference
