# Lumo

Duolingo tarzı İngilizce öğrenme uygulaması (Türkçe konuşanlar için, A1).

**Teknoloji:** React + Vite + TypeScript (ön yüz), Express + TypeScript (API), PostgreSQL (hesap ve ilerleme).
Tek servis: Express, derlenmiş ön yüzü de sunar. Railway'de tek servis + bir Postgres yeter.

## Yerelde çalıştır
```bash
npm run install:all
createdb lumo                                   # ya da Docker ile bir Postgres
cp .env.example .env                            # DATABASE_URL'i düzenle
export $(cat .env | xargs)
npm run dev:server        # http://localhost:3000  (API)
npm run dev:client        # http://localhost:5173  (ön yüz, /api'yi 3000'e yönlendirir)
```
Üretim gibi denemek için: `npm run build && npm start`.

## GitHub + Railway
1. `git init && git add . && git commit -m "ilk sürüm"`, GitHub'da repo aç, push et.
2. Railway → New Project → Deploy from GitHub repo → bu repo.
3. Aynı projeye **Add → Database → PostgreSQL**.
4. Uygulama servisinin Variables kısmında `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referans) ekle.
5. Settings → Networking → Generate Domain. Tablolar ilk açılışta otomatik oluşur.

## Klasörler
- `server/src` — `index.ts` (API), `auth.ts` (scrypt şifre, çerez oturumu), `db.ts` (tablolar)
- `client/src` — `Auth.tsx` (giriş), `Arrange.tsx` (kelime dizme animasyonu), `Lesson.tsx` (ders oynatıcı),
  `Flame.tsx` + `Streak.tsx` (seri), `Views.tsx` (yol, kelimeler, profil), `build.ts` (veri → alıştırma)
- `client/public/data` — kelime ve gramer JSON'ları

## Sonra yapılacaklar
- **Fotoğraflar:** `client/public/img/words/<kelime_id>.webp` koy, kelime kartlarında kullanmak için `build.ts`'e görsel alanı eklenecek.
- **ElevenLabs sesleri:** `client/public/audio/manifest.json` içine `{"hello": "/audio/hello.mp3"}` yaz; `speech.ts` otomatik kullanır, yoksa tarayıcı sesine döner.
- Diyaloglar (`a1_dialogues.json`) henüz arayüze bağlı değil.
