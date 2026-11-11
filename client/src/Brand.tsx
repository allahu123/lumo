import { useEffect, useState } from "react";
import { cx } from "./util";

/* Lumo yazı logosu (şeffaf): /public/img/brand/lumo-wordmark.webp */
export function Wordmark({ height = 40, className }: { height?: number; className?: string }) {
  return <img className={cx("wordmark", className)} src="/img/brand/lumo-wordmark.webp" alt="Lumo" style={{ height }} draggable={false} />;
}

/* Uygulama içi küçük logo: sadece gözler */
export function Eyes({ height = 34, className }: { height?: number; className?: string }) {
  return <img className={cx("eyes-mark", className)} src="/img/brand/eyes.webp" alt="Lumo" style={{ height }} draggable={false} />;
}

/* Açılış ekranı: baykuş ve altında Lumo yazısı. Yazı ya da sayı sayacı yok. */
export function Splash({ out }: { out: boolean }) {
  return (
    <div className={cx("splash", out && "out")} role="status" aria-label="Lumo">
      <div className="splash-stack">
        <div className="splash-peek"><img src="/img/brand/owl.webp" alt="" draggable={false} /></div>
        <Wordmark height={44} className="splash-word" />
      </div>
    </div>
  );
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);

export const FAQ: { q: string; a: string }[] = [
  { q: "Lumo nedir?", a: "Türkçe konuşanlar için hazırlanmış, A1 seviyesinde İngilizce öğrenme uygulaması. 8 bölüm, 32 ünite ve 900 kelimeden oluşuyor." },
  { q: "Ücretli mi?", a: "Hesap açmak ücretsiz. E-posta adresin ve bir şifrenle birkaç saniyede başlayabilirsin." },
  { q: "İngilizceyi hiç bilmiyorum, başlayabilir miyim?", a: "Evet. Her ünite o konunun kelimeleriyle başlar. Ardından Türkçe anlatımlı kılavuz ve üç ders gelir, böylece konuyu önce anlar, sonra uygularsın." },
  { q: "Dersler nasıl işliyor?", a: "Dört tür alıştırma var: çoktan seçmeli, kelimeleri sürükleyip cümle kurma, yazarak cevaplama ve eşleştirme. Dinleyerek çözdüğün sorular da var." },
  { q: "Telaffuzu nasıl öğrenirim?", a: "Kelimelerin ve cümlelerin sesini dinleyebilir, yavaş oynatma düğmesiyle tekrar duyabilirsin. İstersen Profil sayfasından sesi kapatabilirsin." },
  { q: "Seri ve günlük hedef ne işe yarıyor?", a: "Her gün bir ders yaptığında serin uzar. Günlük hedefi 10, 20, 30 ya da 50 XP olarak seçebilirsin ve istediğin zaman değiştirebilirsin." },
  { q: "Yanlış yaptığım kelimeler ne olacak?", a: "Lumo hangi kelimelerde zorlandığını takip eder. Birkaç ders sonra Kelimeler sayfasında zayıf kelimelerini ayrıca çalışabilirsin." },
  { q: "İlerlemem kaybolur mu?", a: "Hayır. İlerlemen hesabına kaydedilir, farklı bir cihazdan giriş yapınca kaldığın yerden devam edersin." },
  { q: "A1'den sonra ne var?", a: "A2 seviyesi hazırlanıyor." },
];

function FaqList() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq">
      {FAQ.map((f, i) => {
        const on = open === i;
        return (
          <div key={f.q} className={cx("faq-item", on && "on")}>
            <button type="button" className="faq-q" aria-expanded={on} aria-controls={`faq-a-${i}`} id={`faq-q-${i}`} onClick={() => setOpen(on ? null : i)}>
              <span>{f.q}</span><PlusIcon />
            </button>
            <div className="faq-a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`}><div><p>{f.a}</p></div></div>
          </div>
        );
      })}
    </div>
  );
}

/* Sık sorulan sorular penceresi (footer'daki bağlantıdan açılır) */
export function FaqDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="dlg" onClick={onClose}>
      <div className="dlg-box" role="dialog" aria-modal="true" aria-label="Sık sorulan sorular" onClick={(e) => e.stopPropagation()}>
        <div className="dlg-head">
          <h2>Sık sorulan sorular</h2>
          <button type="button" className="dlg-x" onClick={onClose} aria-label="Kapat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <FaqList />
      </div>
    </div>
  );
}

/* Sayfa altı: Duolingo tarzı sütunlu bağlantı listesi */
export function Footer({ onRegister, onLogin, onFaq }: { onRegister: () => void; onLogin: () => void; onFaq: () => void }) {
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand"><Wordmark height={34} /></div>
        <nav aria-label="Öğren">
          <h3>Öğren</h3>
          <ul><li>A1 İngilizce</li><li>8 bölüm, 32 ünite</li><li>900 kelime</li><li>Gramer kılavuzları</li></ul>
        </nav>
        <nav aria-label="Özellikler">
          <h3>Özellikler</h3>
          <ul><li>Sesli dinleme</li><li>Cümle kurma</li><li>Günlük seri ve hedef</li><li>Zayıf kelime çalışması</li></ul>
        </nav>
        <nav aria-label="Yardım">
          <h3>Yardım</h3>
          <ul>
            <li><button type="button" onClick={onFaq}>Sık sorulan sorular</button></li>
            <li><button type="button" onClick={onRegister}>Hesap oluştur</button></li>
            <li><button type="button" onClick={onLogin}>Giriş yap</button></li>
          </ul>
        </nav>
      </div>
      <p className="foot-bottom">© 2026 Lumo</p>
    </footer>
  );
}
