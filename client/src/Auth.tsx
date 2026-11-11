import { useState, type FormEvent } from "react";
import { api } from "./api";
import { Eye, EyeOff } from "./icons";
import { FaqDialog, Footer, Wordmark } from "./Brand";
import { useApp } from "./store";
import { cx } from "./util";

export function Auth() {
  const { setUser } = useApp();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(0);
  const [faq, setFaq] = useState(false);
  const reg = mode === "register";

  const fail = (m: string) => { setErr(m); setShake((s) => s + 1); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (reg && name.trim().length < 2) return fail("Adını yaz (en az 2 harf).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return fail("E-posta adresi geçerli görünmüyor.");
    if (pw.length < (reg ? 6 : 1)) return fail(reg ? "Şifre en az 6 karakter olmalı." : "Şifreni yaz.");
    setBusy(true); setErr("");
    try {
      const { user } = reg ? await api.register({ name: name.trim(), email: email.trim(), password: pw }) : await api.login({ email: email.trim(), password: pw });
      setUser(user);
    } catch (x) { fail((x as Error).message); setBusy(false); }
  };
  const swap = (m: "login" | "register") => { setMode(m); setErr(""); };
  const strength = Math.min(3, (pw.length >= 6 ? 1 : 0) + (/[A-Z]/.test(pw) && /[a-z]/.test(pw) ? 1 : 0) + (/\d/.test(pw) || /[^\w\s]/.test(pw) ? 1 : 0));

  return (
    <div className="auth">
      <aside className="auth-hero">
        <Wordmark height={46} className="hero-mark" />
        <div className="hero-body">
          <h1>Her kelime bir ses, <span>bir oyun, bir adım.</span></h1>
          <p className="lead">Kısa dersler, sesli kelimeler, gramer ve sınırsız deneme. Enerji bitmez, seri bozulmaz, sen öğrenirsin.</p>
        </div>
      </aside>

      <main className="auth-pane">
        <div className="auth-top-brand"><Wordmark height={40} /></div>
        <form className={cx("auth-card", shake > 0 && "shake")} key={shake} onSubmit={submit} noValidate>
          <div className="seg" role="tablist">
            <button type="button" role="tab" aria-selected={reg} className={cx(reg && "on")} onClick={() => swap("register")}>Hesap oluştur</button>
            <button type="button" role="tab" aria-selected={!reg} className={cx(!reg && "on")} onClick={() => swap("login")}>Giriş yap</button>
          </div>
          <h2>{reg ? "Yolculuğa başla" : "Tekrar hoş geldin"}</h2>
          <p className="muted">{reg ? "Ücretsiz hesabını oluştur, ilerlemen kaydedilsin." : "Kaldığın yerden devam et."}</p>

          {reg && (
            <>
              <label className="lbl" htmlFor="f-name">Adın</label>
              <div className="field"><input id="f-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Ayşe" maxLength={24} autoComplete="given-name" autoFocus /></div>
            </>
          )}
          <label className="lbl" htmlFor="f-mail">E-posta</label>
          <div className="field"><input id="f-mail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoFocus={!reg} /></div>
          <label className="lbl" htmlFor="f-pw">Şifre</label>
          <div className="field">
            <input id="f-pw" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={reg ? "En az 6 karakter" : "Şifren"} type={show ? "text" : "password"} autoComplete={reg ? "new-password" : "current-password"} />
            <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>{show ? <EyeOff /> : <Eye />}</button>
          </div>
          {reg && pw && (
            <div className="meter" aria-hidden="true">{[0, 1, 2].map((n) => <i key={n} className={cx(strength > n && "on", strength > n && `s${strength}`)} />)}</div>
          )}
          <div className="form-err" role="alert">{err}</div>
          <button className="btn primary wide big" disabled={busy}>{busy ? "Bir saniye…" : reg ? "Hesabı oluştur" : "Giriş yap"}</button>
          {!reg && <p className="fine">Hesabın yok mu? <button type="button" className="link" onClick={() => swap("register")}>Ücretsiz oluştur</button></p>}
        </form>
      </main>

      <Footer
        onRegister={() => { swap("register"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onLogin={() => { swap("login"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onFaq={() => setFaq(true)}
      />
      {faq && <FaqDialog onClose={() => setFaq(false)} />}
    </div>
  );
}
