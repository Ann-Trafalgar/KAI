# K · A · I — Smart Assistant 
---

## What is KAI?

**KAI** (Knowledge and Accessibility Interface) is a simulated smartphone assistant. A voice/chat-powered assistant — designed to teach users how to perform common digital tasks through guided, step-by-step walkthroughs.

Instead of just telling you what to do, KAI *shows* you. When you give it a command, it opens the relevant app and highlights exactly where to tap, what to type, and what to expect — like having a patient guide walking you through your phone for the first time.

---

## Core Features

### 🤖 The KAI Assistant
The central AI assistant accessible from the dock on the home screen. KAI understands natural language commands in **three languages** and responds with voice synthesis, on-screen text, and interactive guides.

**Two input modes:**
- **Voice** — Tap the mic bar and speak your command
- **Chat** — Switch to text mode and type your command; KAI replies in a chat bubble interface

---

### 📱 Apps Included

| App | Description |
|-----|-------------|
| **GCash** | Full simulated GCash experience — send money, receive via QR code, PIN entry, and transaction history |
| **Facebook** | Simulated feed with like/react, post sharing, and photo upload flows |
| **Shopee** | E-commerce app with search, product grid, and KAI's smart recommendation banner |
| **Contacts** | Full contact list with search, alphabetical grouping, and a simulated dial screen |
| **Calculator** | Functional calculator |
| **Clock** | Analog + digital clock |
| **Wikipedia** | Wikipedia search viewer |
| **Google / YouTube / Maps** | External app launchers |

---

### 🛡️ KAI Settings

Accessible via the gear icon on the KAI screen.

| Setting | Description |
|---------|-------------|
| **Spend Guard** | Locks all financial guides (GCash send/receive). Useful for parental control or limiting spending-related walkthroughs |
| **Command Language** | Switch KAI's voice/chat input language between English, Taglish, and Tagalog |
| **Smart Suggestions** | When enabled, KAI analyzes Shopee search results and highlights the best product based on a combined rating + sales score |

---

## Complete Command Reference

Commands are matched by keywords — you don't have to say the exact phrase. Any sentence containing the trigger words will work.

---

### 💸 GCash — Send Money

Guides you through the full 4-step send money flow: enter recipient number → enter amount → review → PIN.

| Language | Example Commands |
|----------|-----------------|
| English | `"send money"` · `"transfer money"` · `"help me send"` · `"how to send"` |
| Taglish | `"magpadala ng pera"` · `"padala ng pera"` · `"help me magpadala"` · `"paano magpadala"` · `"mag send ng pera"` |
| Tagalog | `"magpadala ng pera"` · `"paano magpadala"` · `"tulungan mo akong magpadala"` · `"padala"` |

> ⚠️ Blocked when **Spend Guard** is enabled.

---

### 📲 GCash — Receive Money / QR Code

Guides you through activating your QR code to receive money.

| Language | Example Commands |
|----------|-----------------|
| English | `"receive money"` · `"help me receive"` · `"activate qr"` · `"qr code"` · `"how to receive"` |
| Taglish | `"tumanggap ng pera"` · `"i-activate ang qr"` · `"qr code ko"` · `"paano tumanggap"` · `"help me tumanggap"` |
| Tagalog | `"tumanggap ng pera"` · `"paano tumanggap"` · `"i-activate ang qr code"` · `"kunin ang pera"` |

> ⚠️ Blocked when **Spend Guard** is enabled.

---

### 📸 Facebook — Upload a Photo

Guides you through selecting a photo from the gallery, adding a caption, and posting it.

| Language | Example Commands |
|----------|-----------------|
| English | `"upload a photo"` · `"post a photo"` · `"how do i upload"` · `"share a photo"` · `"post photo"` |
| Taglish | `"mag-upload ng photo"` · `"mag post ng picture"` · `"paano mag-upload"` · `"i-share ang photo"` |
| Tagalog | `"mag-upload ng larawan"` · `"paano mag-post ng larawan"` · `"i-share ang larawan"` |

---

### 👍 Facebook — React to a Post

Guides you through long-pressing the Like button to open the reaction picker and choosing a reaction.

| Language | Example Commands |
|----------|-----------------|
| English | `"react to a post"` · `"how to react"` · `"like a post"` · `"how do i react"` · `"love react"` |
| Taglish | `"mag-react sa post"` · `"paano mag-react"` · `"i-like ang post"` · `"paano mag-like"` |
| Tagalog | `"mag-react sa objek"` · `"paano mag-like"` · `"paano mag-react sa post"` |

---

### 🔁 Facebook — Share a Post

Guides you through tapping Share and choosing "Share Now" on a post.

| Language | Example Commands |
|----------|-----------------|
| English | `"share a post"` · `"how to share"` · `"share post"` · `"how do i share"` |
| Taglish | `"i-share ang post"` · `"paano mag-share"` · `"share ng post"` · `"mag share"` |
| Tagalog | `"ibahagi ang post"` · `"paano ibahagi"` · `"paano mag-share ng post"` |

---

### 🛒 Shopee — Shop / Buy a Product

Opens Shopee and guides you through searching for a product, browsing results, and adding to cart.

When **Smart Suggestions** is ON, KAI also analyzes the results and highlights the top-rated, best-selling product with a recommendation banner.

| Language | Example Commands |
|----------|-----------------|
| English | `"help me shop"` · `"open shopee"` · `"shopee"` · `"help me buy"` · `"i want to buy"` · `"shop in shopee"` |
| Taglish | `"help me shop"` · `"buksan ang shopee"` · `"shopee"` · `"gusto kong bumili"` · `"mag-shop sa shopee"` |
| Tagalog | `"tulungan mo akong mamili"` · `"buksan ang shopee"` · `"shopee"` · `"gusto kong bumili"` |

---

### 📞 Contacts — Open Contacts App

| Language | Example Commands |
|----------|-----------------|
| English | `"open contacts"` · `"contacts"` |
| Taglish | `"buksan ang contacts"` · `"contacts"` |
| Tagalog | `"buksan ang contacts"` · `"contacts"` |

---

### 📞 Contacts — Call / Dial a Contact

Searches your contact list by name and launches the simulated dial screen. After 3 seconds it automatically connects and starts a call timer.

| Language | Example Commands |
|----------|-----------------|
| English | `"call [name]"` · `"dial [name]"` · `"contact [name]"` · `"phone [name]"` |
| Taglish | `"tawagan si [name]"` · `"i-call si [name]"` · `"i-dial si [name]"` · `"tumawag"` |
| Tagalog | `"tawagan si [name]"` · `"tumawag kay [name]"` · `"i-call si [name]"` |

**Example:** `"call Ana Santos"` · `"dial Bernard"` · `"tawagan si Alex"`

The name doesn't have to be exact — KAI does a partial match. `"call bea"` will find *Bea Villanueva*.

---

### 📱 App Launchers

Open apps directly without a guided tour.

| App | English | Taglish | Tagalog |
|-----|---------|---------|---------|
| Facebook | `"open facebook"` | `"buksan ang facebook"` | `"buksan ang facebook"` |
| GCash | `"open gcash"` · `"gcash"` | `"buksan ang gcash"` | `"buksan ang gcash"` |
| Google | `"open google"` | `"buksan ang google"` | `"buksan ang google"` |
| YouTube | `"open youtube"` | `"buksan ang youtube"` | `"buksan ang youtube"` |
| Calculator | `"calculator"` · `"open calculator"` | `"kalkulator"` | `"kalkulator"` |
| Clock | `"clock"` · `"open clock"` | `"orasan"` | `"buksan ang orasan"` |
| Wikipedia | `"wikipedia"` · `"open wikipedia"` | `"wikipedia"` | `"wikipedia"` |

---

### 🕐 Utilities

| Command | English | Taglish | Tagalog |
|---------|---------|---------|---------|
| Current time | `"what time"` · `"time is it"` | `"anong oras"` · `"oras na"` | `"anong oras na"` |
| Today's date | `"what date"` · `"what day"` | `"anong petsa"` · `"anong araw"` | `"anong petsa"` |
| Open settings | `"settings"` · `"open settings"` | `"settings"` | `"mga setting"` |
| Go home | `"go home"` · `"home screen"` | `"go home"` · `"uwi"` | `"umuwi"` · `"bumalik sa home"` |
| Greet KAI | `"hello"` · `"hey"` · `"hi kai"` | `"hello"` · `"kumusta"` · `"oy kai"` | `"kumusta"` · `"magandang araw"` |

---

## Contacts List

KAI comes pre-loaded with the following contacts, all dialable by name:

| Name | Phone |
|------|-------|
| Alex Reyes | +63 912 345 6789 |
| Ana Santos | +63 917 234 5678 |
| Bea Villanueva | +63 921 876 5432 |
| Bernard | +63 933 481 2096 |
| Carlo Dizon | +63 908 123 4567 |
| Diana Cruz | +63 939 987 6543 |
| Eduardo Lim | +63 995 567 8901 |
| Fatima Ramos | +63 906 654 3210 |
| Gabriel Torres | +63 918 432 1098 |
| Hannah Flores | +63 927 765 4321 |
| Ivan Mendoza | +63 945 321 6789 |
| Jasmine Aquino | +63 932 111 2222 |
| Kevin Bautista | +63 919 333 4444 |
| Lara Navarro | +63 961 555 6666 |
| Marco Dela Cruz | +63 904 777 8888 |
| Nina Garcia | +63 952 999 0000 |

---

## File Structure

```
├── index.html      — App structure, screens, and overlays
├── styles.css      — All styling (glassmorphism UI, app screens, dial overlay, chat UI)
└── script.js       — All logic (KAI engine, guides, app simulations, contacts, dial)
```

---

## Language Notes

- KAI detects the **active language** set in Settings and only matches commands in that language.
- If you speak in the wrong language, KAI will tell you and remind you to change the setting.
- All three languages always reply in **English** — the language setting only affects what words KAI *listens* for.

---

*KAI OS v2.4.1 — Built as an interactive digital literacy simulator*

CREATED BY: ANN TRAFALGAR