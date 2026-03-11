# Snake

Minimal browser-based Snake game met gedeelde online leaderboard via Supabase of lokale fallback in de browser.

## Kort uitgelegd

- `localStorage` bewaart data alleen in jouw eigen browser op jouw eigen apparaat.
- Daarom zag je eerder geen scores terug in een andere browser of op een andere computer.
- Voor een gedeelde leaderboard moet iedereen dezelfde website openen en moeten scores in een centrale online database staan.
- Deze repo ondersteunt nu precies dat: lokaal zonder setup, of online gedeeld via Supabase.

## Bestanden voor online leaderboard

- `config.js`: lokale configuratie voor jouw project
- `config.example.js`: voorbeeldconfiguratie
- `supabase.sql`: SQL om de leaderboard-tabel en policies aan te maken

## Online zetten

1. Maak een Supabase-project aan.
2. Open de SQL editor in Supabase en voer [supabase.sql](C:\Users\x\Desktop\Codex\Test 1\supabase.sql) uit.
3. Kopieer [config.example.js](C:\Users\x\Desktop\Codex\Test 1\config.example.js) naar `config.js` en vul je eigen `supabaseUrl` en `supabaseAnonKey` in.
4. Host deze map als statische site, bijvoorbeeld op Vercel, Netlify of GitHub Pages.
5. Deel daarna de URL van die site. Iedereen die die link opent, gebruikt dezelfde online leaderboard.

## Lokaal draaien

Open [index.html](C:\Users\x\Desktop\Codex\Test 1\index.html) in een moderne browser.

Als je browser ES modules vanaf het bestandssysteem blokkeert, serveer deze map dan via een simpele static file server en open daarna `index.html`.

## Controls

- Arrow keys of `WASD`: bewegen
- `Space`: starten of pauzeren
- `Enter`: opnieuw beginnen na game over
- On-screen knoppen zijn zichtbaar op kleinere schermen

## Gedrag

- Bij de eerste keer spelen vul je een naam in; die wordt lokaal opgeslagen in `localStorage`
- Zonder Supabase-config blijft de leaderboard lokaal per browser
- Met Supabase-config wordt de leaderboard gedeeld tussen alle spelers op dezelfde site
- De slang gaat door muren heen en komt aan de andere kant weer uit

## Handmatig controleren

- Eerste bezoek vraagt om een naam en toont die daarna bovenin
- Leaderboard toont `Lokale browser-opslag` zonder online setup
- Leaderboard toont `Online gedeelde leaderboard` zodra `config.js` correct is ingevuld
- Een score van speler A is zichtbaar voor speler B via dezelfde gedeelde URL
- Hogere scores komen bovenaan te staan
- Direct 180 graden omdraaien blijft geblokkeerd
- Eten vergroot de slang en verhoogt de score
- Door de linker-, rechter-, boven- en onderrand gaan wrapt correct naar de overkant
- Botsen met het eigen lichaam eindigt het spel

## Opmerking

Deze leaderboard is geschikt voor casual gebruik. Omdat spelers geen account hoeven te hebben, kan iemand technisch gezien nog steeds een score faken via browsertools. Als je dat echt wilt afdichten, heb je server-side validatie of echte authenticatie nodig.