# Σήμα · Web Live Quiz

Εφαρμογή για ζωντανά quiz στην τάξη, με διαφορετική οθόνη καθηγητή και παίκτη. Ο καθηγητής δημιουργεί ερωτήσεις, ανοίγει δωμάτιο με PIN και ελέγχει τη ροή. Οι παίκτες συμμετέχουν από browser. Οι απαντήσεις, τα αποτελέσματα και η κατάταξη ενημερώνονται με SignalR.

Πρώτη λειτουργική έκδοση για ανάπτυξη πτυχιακής. Το όνομα, τα χρώματα και τα κείμενα μπορούν να αλλάξουν χωρίς αλλαγή του μηχανισμού παιχνιδιού.

## Τι περιλαμβάνει

- Δημιουργία και επεξεργασία quiz, 1–30 ερωτήσεις, τέσσερις επιλογές, μία σωστή απάντηση.
- Χρόνος 10–120 δευτερολέπτων ανά ερώτηση.
- Αποθήκευση quiz σε MySQL με EF Core / Pomelo.
- Lobby, εξαψήφιο PIN, έως 100 παίκτες ανά δωμάτιο.
- Server-side χρονόμετρο, βαθμολογία ταχύτητας και προστασία από διπλές / εκπρόθεσμες απαντήσεις.
- Σωστές απαντήσεις και αλλαγές στο σκορ κρυφές μέχρι την αποκάλυψη.
- Live κατανομή απαντήσεων μετά το κλείσιμο της ερώτησης, leaderboard, τελικά αποτελέσματα CSV.
- Επανασύνδεση παίκτη και καθηγητή με διατήρηση ταυτότητας / σκορ.
- Εισαγωγή και εξαγωγή quiz σε JSON, έτοιμο δοκιμαστικό quiz.
- Ελληνικό responsive UI, ορατό keyboard focus, επιλογές με γράμματα εκτός από χρώμα, σεβασμός reduced motion.

## Στοίβα

.NET 8 / ASP.NET Core Web API / SignalR / EF Core / Pomelo / MySQL 8.
React / TypeScript / Vite / Tailwind CSS / Axios / @microsoft/signalr.
Playwright και integration checks με πραγματικούς SignalR clients.

Το Node 22 προτιμάται αντί των παλαιότερων 18/20. Η εφαρμογή κρατά τη .NET 8 που επιλέχθηκε για την πτυχιακή· πριν από μελλοντικό public deployment έλεγξε την περίοδο υποστήριξής της.

## Γρήγορη πρώτη δοκιμή, χωρίς βάση

Εγκατάστησε .NET SDK **8.0.4xx ή νεότερο 8.0.x** και Node.js 22. Δεν χρειάζονται Xcode, emulator ή Docker.

Από τον φάκελο του repository:

```bash
cd frontend
npm ci
cd ..
bash scripts/dev.sh --demo
```

Άνοιξε στον τοπικό υπολογιστή σου το `http://localhost:5173`. Στα «Τα quiz μου» πρόσθεσε το δοκιμαστικό quiz, πάτησε «Παίξε live» και άνοιξε δεύτερη καρτέλα στη σελίδα συμμετοχής. Βάλε το PIN και όνομα παίκτη. Η οθόνη καθηγητή ξεκινά το παιχνίδι.

Το demo χρησιμοποιεί **EF InMemory**, όχι MySQL. Όλα τα quiz χάνονται στο κλείσιμο του backend. Οι παλιές αναφορές μπορεί να παραμείνουν στη βιβλιοθήκη του browser. Για κανονική δουλειά χρησιμοποίησε MySQL.

## MySQL στο MacBook Intel / 8GB

Η native εγκατάσταση αποφεύγει τη μόνιμη κατανάλωση του Docker Desktop. Αν χρησιμοποιείς Homebrew:

```bash
brew install mysql@8.0
brew services start mysql@8.0
"$(brew --prefix mysql@8.0)/bin/mysql" -u root
```

Σε υπάρχουσα εγκατάσταση χρησιμοποίησε τη δική σου μέθοδο σύνδεσης και κωδικό. Μέσα στη MySQL εκτέλεσε:

```sql
CREATE DATABASE IF NOT EXISTS sima CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sima'@'localhost' IDENTIFIED BY 'sima_local_dev';
GRANT ALL PRIVILEGES ON sima.* TO 'sima'@'localhost';
```

Το παραπάνω password είναι παράδειγμα **μόνο για τοπική ανάπτυξη**. Άλλαξέ το αν η βάση είναι προσβάσιμη από άλλους.

```bash
cp .env.example .env
```

Στο `.env` άλλαξε `Port=3307` σε `Port=3306` για native MySQL και συμπλήρωσε τα δικά σου στοιχεία. Το αρχείο αγνοείται από το Git.

```bash
bash scripts/dev.sh --mysql
```

Η βάση πρέπει να λειτουργεί πριν ξεκινήσει το API. Το αρχικό σχήμα δημιουργείται με `EnsureCreatedAsync`. Δεν εφαρμόζονται αυτόματες αλλαγές σε υπάρχον σχήμα: πριν εξελίξεις το μοντέλο με δεδομένα που θέλεις να κρατήσεις, πρόσθεσε EF migrations και αντικατάστησε το `EnsureCreatedAsync`.

### Εναλλακτικά, MySQL με Docker

```bash
docker compose up -d --wait
cp .env.example .env   # μόνο αν δεν έχεις ήδη .env
bash scripts/dev.sh --mysql
```

Η βάση ακούει μόνο τοπικά στη θύρα 3307 και κρατά δεδομένα σε named volume. Το `docker compose down` σταματά τη βάση χωρίς διαγραφή δεδομένων. Το `docker compose down -v` διαγράφει το volume: μην το τρέξεις αν χρειάζεσαι τα δεδομένα.

## Δύο servers με ξεχωριστά terminals

Αν θέλεις να βλέπεις κάθε log χωριστά, αντί για το helper script:

```bash
# Terminal 1, από τον φάκελο backend
# Χρησιμοποίησε τα δικά σου τοπικά στοιχεία σύνδεσης:
ConnectionStrings__Quiz='Server=127.0.0.1;Port=3307;Database=sima;User=sima;Password=sima_local_dev' dotnet run

# Terminal 2, από τον φάκελο frontend
npm run dev
```

Σταμάτα τον dev server πριν από νέα εγκατάσταση dependencies (`npm ci`) και άνοιξέ τον ξανά μετά· ο Vite κρατά cache των dependencies όσο τρέχει.

Το API είναι στη θύρα 5080. Ο Vite στη 5173 προωθεί `/api` και `/hubs` στο API, μαζί με το WebSocket upgrade. Δεν χρειάζεται να αλλάζεις URLs μέσα στα components. Για δοκιμή με κινητό στο ίδιο Wi-Fi χρησιμοποίησε τη LAN IP του υπολογιστή στη θύρα 5173· το API παραμένει πίσω από τον Vite proxy. Η αντιγραφή πρόσκλησης ενδέχεται να μην επιτρέπεται από browser σε απλό HTTP εκτός localhost· το PIN εξακολουθεί να λειτουργεί.

## Έλεγχοι

Με backend και frontend ήδη ανοιχτά:

```bash
node tests/live.mjs
cd frontend
npx playwright install chromium  # μία φορά
npm run test:e2e
npm run build
```

Με .NET στο PATH μπορείς να τρέξεις από τη ρίζα `bash scripts/check.sh` για όλα τα παραπάνω μαζί με backend build. Εναλλακτικό API: `API_URL=http://127.0.0.1:5081 node tests/live.mjs`. Εναλλακτικός browser: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`.

Οι integration έλεγχοι καλύπτουν αποθήκευση/επεξεργασία, owner keys, host permissions, σωστό snapshot quiz, κρυφές σωστές απαντήσεις και σκορ, reconnect, duplicate/stale/late answers, χρονόμετρο και τελική κατάταξη. Οι browser έλεγχοι καλύπτουν editor, mobile layout και πλήρες παιχνίδι με δύο ανεξάρτητα browser contexts. Δημιουργούν δικά τους δοκιμαστικά δεδομένα· χρησιμοποίησε development βάση. Τα screenshots των browser tests γράφονται στο `/tmp`.

Αναλυτικά αποτελέσματα της τρέχουσας επαλήθευσης: [VALIDATION.md](docs/VALIDATION.md).

Το GitHub Actions workflow εκτελεί build και τις δύο σουίτες με MySQL. Το workflow παρέχεται ως κώδικας· δεν σημαίνει ότι έχει ήδη εκτελεστεί στο GitHub.

## Πού αλλάζω τι;

Δες τον [οδηγό κώδικα](docs/CODE_GUIDE.md) και την [αρχιτεκτονική / συμβόλαια API](docs/ARCHITECTURE.md). Υπάρχουν ελληνικά σχόλια στα σημεία που εξηγούν το γιατί: κλείδωμα δωματίου, βαθμολογία, σωστές απαντήσεις, επανασύνδεση και αποθήκευση.

## Όρια αυτής της έκδοσης

Δεν υπάρχουν ακόμη λογαριασμοί χρηστών. Κάθε quiz προστατεύεται από τυχαίο owner key: μόνο το hash του αποθηκεύεται στη βάση, το κλειδί φυλάσσεται στον browser του δημιουργού. Καθαρισμός browser ή αλλαγή συσκευής σημαίνει απώλεια της πρόσβασης. Κράτα εξαγωγή JSON για μεταφορά του περιεχομένου. Τα room tokens είναι προσωρινά στο `sessionStorage`. Το PIN μόνο του δεν δίνει δικαιώματα καθηγητή.

Τα live δωμάτια και τα αποτελέσματα μένουν στη μνήμη ενός backend, λήγουν μετά από 4 ώρες αδράνειας και χάνονται σε επανεκκίνηση. Τα quiz παραμένουν στη MySQL. Εξήγαγε τα αποτελέσματα πριν κλείσεις το παιχνίδι. Η βιβλιοθήκη δείχνει τα quiz που δημιουργήθηκαν σε αυτόν τον browser, όχι κατάλογο όλων των εγγραφών της βάσης.

Για δημόσια υπηρεσία χρειάζονται authentication / accounts, HTTPS και production reverse proxy, μόνιμο ιστορικό συνεδριών, migrations και backups, αυστηρότερο rate limiting για hub invocations, καθώς και κοινό state / backplane αν χρησιμοποιήσεις πολλούς servers. Το όριο 100 παικτών είναι κανόνας της εφαρμογής, όχι επιβεβαιωμένο αποτέλεσμα load test. Δεν έχουν γίνει δοκιμές φόρτου ή έλεγχος σε πραγματικές iOS / Android συσκευές.

Στο cloud κάθε task έχει ήδη απομονωμένο checkout· χρησιμοποίησέ το χωρίς να δημιουργείς επιπλέον Git worktree. Οι διαδικασίες των servers χρειάζονται εκκίνηση σε κάθε νέα συνεδρία.
