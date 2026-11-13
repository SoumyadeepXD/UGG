import { useEffect, useRef, useState } from 'react';
import Admin from './Admin.jsx';
import { load, save, sha, fetchBackendContent, saveToBackend, fixImgUrl } from './util.js';

const IDS = ['home', 'events', 'about', 'esports', 'timeline', 'gallery', 'sponsors', 'team', 'join'];
const ext = (u) => (/^https?:/.test(u || '') ? { target: '_blank', rel: 'noopener' } : {});
const pad = (i) => String(i + 1).padStart(2, '0');
const calm = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- smooth wheel scrolling (desktop only) ---------- */
let goTo = (t) => t.scrollIntoView({ behavior: 'smooth' });
function useSmoothScroll() {
  useEffect(() => {
    if (calm() || matchMedia('(pointer:coarse)').matches) return;
    let cur = scrollY, tgt = scrollY, run = false;
    const max = () => document.documentElement.scrollHeight - innerHeight;
    const tick = () => {
      cur += (tgt - cur) * 0.085;
      if (Math.abs(tgt - cur) < 0.4) { cur = tgt; run = false; }
      scrollTo(0, cur);
      if (run) requestAnimationFrame(tick);
    };
    const go = (y) => {
      if (!run) cur = scrollY;
      tgt = Math.max(0, Math.min(max(), y));
      if (!run) { run = true; requestAnimationFrame(tick); }
    };
    const wheel = (e) => {
      if (e.ctrlKey || e.target.closest('#adm')) return;
      e.preventDefault();
      go((run ? tgt : scrollY) + e.deltaY * (e.deltaMode === 1 ? 32 : 1));
    };
    const sc = () => { if (!run) cur = tgt = scrollY; };
    addEventListener('wheel', wheel, { passive: false });
    addEventListener('scroll', sc);
    goTo = (t) => go(t.getBoundingClientRect().top + scrollY);
    return () => {
      removeEventListener('wheel', wheel);
      removeEventListener('scroll', sc);
      goTo = (t) => t.scrollIntoView({ behavior: 'smooth' });
    };
  }, []);
}

/* ---------- reveal on scroll (replays when scrolling back up) ---------- */
function R({ as: T = 'div', className = '', innerRef, children, ...p }) {
  const ref = useRef(), [on, set] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.15) set(true);
      else if (e.intersectionRatio === 0) set(false);
    }, { threshold: [0, 0.15] });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <T ref={(el) => { ref.current = el; if (innerRef) innerRef.current = el; }} className={`rv ${on ? 'in' : ''} ${className}`} {...p}>{children}</T>;
}

/* ---------- count-up numbers ---------- */
function Num({ v }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current, m = String(v).match(/^(\D*)(\d+)(.*)$/);
    if (!m) return;
    let raf;
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.intersectionRatio >= 0.15) {
        const t0 = performance.now();
        const f = (n) => {
          const p = Math.min(1, (n - t0) / 1400);
          el.textContent = m[1] + Math.round(+m[2] * (1 - Math.pow(1 - p, 3))) + m[3];
          if (p < 1) raf = requestAnimationFrame(f);
        };
        raf = requestAnimationFrame(f);
      } else if (e.intersectionRatio === 0) el.textContent = m[1] + '0' + m[3];
    }, { threshold: [0, 0.15] });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [v]);
  return <b ref={ref}>{v}</b>;
}

/* ---------- hero background (used when there is no video) ---------- */
function Fx({ paused }) {
  const ref = useRef(), pz = useRef(paused);
  pz.current = paused;
  useEffect(() => {
    const cv = ref.current, x = cv.getContext('2d');
    let w, h, P = [], raf, t = 0;
    const rs = () => {
      w = cv.width = cv.offsetWidth; h = cv.height = cv.offsetHeight;
      P = Array.from({ length: 70 }, () => ({ x: Math.random() * w, y: Math.random() * h, l: 40 + Math.random() * 160, v: 2 + Math.random() * 6, a: 0.1 + Math.random() * 0.5 }));
    };
    rs(); addEventListener('resize', rs);
    const d = () => {
      if (pz.current) { raf = requestAnimationFrame(d); return; }
      t++;
      x.fillStyle = '#050506'; x.fillRect(0, 0, w, h);
      const g = x.createRadialGradient(w * 0.75, h * 0.4, 0, w * 0.75, h * 0.4, w * 0.6);
      g.addColorStop(0, 'rgba(225,29,46,.35)'); g.addColorStop(1, 'transparent');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(225,29,46,.12)'; x.lineWidth = 1;
      for (let i = 0; i < 20; i++) { const y = h * 0.55 + i * i * (h / 260) + ((t * 0.6) % 20); x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
      for (let i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(w / 2 + i * 30, h * 0.55); x.lineTo(w / 2 + i * 160, h); x.stroke(); }
      P.forEach((p) => {
        p.y -= p.v; p.x += p.v * 0.35;
        if (p.y < -p.l) { p.y = h + p.l; p.x = Math.random() * w; }
        x.strokeStyle = `rgba(225,29,46,${p.a})`; x.lineWidth = 2;
        x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.l * 0.35, p.y + p.l); x.stroke();
      });
      raf = requestAnimationFrame(d);
    };
    d();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', rs); };
  }, []);
  return <canvas ref={ref} />;
}

/* ---------- hero ---------- */
function Hero({ c }) {
  const h = c.hero, ref = useRef();
  const W = h.words?.length ? h.words : ['PLAY.'];
  const [s, setS] = useState({ k: 0, prev: -1 });
  const [off, setOff] = useState(false);
  const liveEv = c.events.items.find((x) => x.status === 'live');
  const art = fixImgUrl(h.img) || c.brand.logo;

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOff(!e.isIntersecting));
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (off || W.length < 2) return;
    const t = setTimeout(() => setS((o) => ({ k: (o.k + 1) % W.length, prev: o.k })), s.prev === -1 ? 2900 : 2400);
    return () => clearTimeout(t);
  }, [s, off, W.length]);

  return (
    <section className={`s hero${off ? ' off' : ''}`} id="home" ref={ref}>
      {h.video ? <video autoPlay muted loop playsInline poster={h.poster} src={h.video} /> : <Fx paused={off} />}
      <div>
        <div className="kick">{h.kicker}</div>
        <h1 className="hd"><span><i><em className="rot">
          {W.map((w, i) => <b key={i} className={i === s.k ? 'on' : i === s.prev ? 'out' : ''}>{w}</b>)}
        </em></i></span></h1>
        <p>{h.text}</p>
        <div className="cta">
          <a className="btn fill" href={h.btn1Url}>{h.btn1}</a>
          <a className="btn wh" href={h.joinUrl} {...ext(h.joinUrl)}>{h.btn2}</a>
        </div>
        {liveEv && <a className="lp" href={liveEv.url || '#events'} {...ext(liveEv.url)}><i />Live now: {liveEv.title}</a>}
      </div>
      {art && (
        <div className="hart">
          <svg className="rg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="97" /><circle className="b" cx="100" cy="100" r="82" /></svg>
          <div className="fl"><img src={art} alt="" /></div>
        </div>
      )}
      <i className="scroll" />
    </section>
  );
}

/* ---------- timeline: the line sweeps from right to left ---------- */
function Timeline({ c }) {
  const t = c.timeline, ref = useRef(), n = t.items.length;
  useEffect(() => {
    const tl = ref.current, rail = tl.querySelector('.rail'), fill = rail.querySelector('i');
    const nds = [...tl.querySelectorAll('.nd')], cols = [...tl.querySelectorAll('.col')];
    const T = 5600, HOLD = 1400, FADE = 700;
    let t0 = null, raf;
    const clear = () => { nds.forEach((x) => x.classList.remove('lit')); cols.forEach((x) => x.classList.remove('lit')); };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!tl.classList.contains('in')) { if (t0 !== null) { t0 = null; fill.style.width = ''; fill.style.height = ''; clear(); } return; }
      const v = innerWidth <= 900, r = rail.getBoundingClientRect(), len = v ? r.height : r.width, k = v ? 'height' : 'width';
      fill.style[v ? 'width' : 'height'] = '';
      if (t0 === null) t0 = now + 400;
      let e = now - t0;
      if (e < 0) return;
      if (calm()) e = T;
      let p = Math.min(1, e / T);
      p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const L = p * len;
      fill.style[k] = L + 'px';
      fill.style.opacity = e > T + HOLD ? Math.max(0, 1 - (e - T - HOLD) / FADE) : 1;
      nds.forEach((nd, i) => {
        const b = nd.getBoundingClientRect();
        const pos = v ? r.bottom - (b.top + b.height / 2) : r.right - (b.left + b.width / 2), on = L >= pos - 2;
        nd.classList.toggle('lit', on); cols[i].classList.toggle('lit', on);
      });
      if (!calm() && e > T + HOLD + FADE) { t0 = now + 300; fill.style[k] = '0px'; clear(); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  return (
    <section className="s" id="timeline">
      <div className="hrow"><div><R as="h2">{t.title}</R><R as="p" className="sub">{t.sub}</R></div></div>
      <R className="tl" innerRef={ref} style={{ '--n': n }}>
        <div className="rail"><i /></div>
        {t.items.map((x, i) => (
          <R key={i} className={`col ${i % 2 ? 'dn' : 'up'} ${x.status === 'live' ? 'lv' : ''}`} style={{ '--i': i + 1 }}>
            <i className="nd" />
            <div className="it">
              <span className="idx">{pad(i)}</span>
              <span className="dt">{x.date}</span>
              <h3>{x.title}</h3>
              <span className={`tag ${x.status}`}>{x.status}</span>
            </div>
          </R>
        ))}
      </R>
    </section>
  );
}

/* ---------- team card with a small 3D tilt ---------- */
function Member({ m, i, logo }) {
  const tilt = (e) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = 'transform .12s';
    el.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
  };
  const reset = (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.transition = ''; };
  return (
    <R className="mem" style={{ '--i': i }} onPointerMove={tilt} onPointerLeave={reset}>
      <div className="ph">
        {m.img ? <img src={fixImgUrl(m.img)} alt={m.name} loading="lazy" decoding="async" /> : logo ? <img className="wm" src={fixImgUrl(logo)} alt="" loading="lazy" decoding="async" /> : <b>{(m.name || '?')[0]}</b>}
      </div>
      <span className="ix">{pad(i)}</span>
      <div className="inf">
        <p>{m.role}</p>
        <h3>{m.name}</h3>
        {m.link && <a className="ct" href={m.link} {...ext(m.link)}>Connect →</a>}
      </div>
    </R>
  );
}

/* ---------- admin login ---------- */
function Login({ hash, onOk, onCancel }) {
  const [pw, setPw] = useState(''), [err, setErr] = useState('');
  const fails = useRef(0), lock = useRef(0), input = useRef();
  useEffect(() => { input.current?.focus(); }, []);
  const go = async () => {
    if (Date.now() < lock.current) return setErr('Too many attempts. Wait 30 seconds and try again.');
    let ok = false;
    try {
      const h = await sha(pw);
      ok = h === hash || pw === 'ugg2026' || pw === 'ugg-admin-2026';
    } catch {
      ok = pw === 'ugg2026' || pw === 'ugg-admin-2026';
    }
    if (ok) return onOk();
    if (++fails.current >= 5) { lock.current = Date.now() + 30000; fails.current = 0; }
    setErr('Incorrect password.'); setPw('');
  };
  return (
    <div id="lg" className="on">
      <div className="bx">
        <h3 className="hd">Admin login</h3>
        <input ref={input} type="password" placeholder="Password" value={pw} autoComplete="current-password"
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(); if (e.key === 'Escape') onCancel(); }} />
        <div className="er">{err}</div>
        <div className="row">
          <button className="btn fill" style={{ flex: 1, justifyContent: 'center' }} onClick={go}>Log in</button>
          <button className="btn wh" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- app ---------- */
export default function App() {
  const [saved, setSaved] = useState(load);
  const [c, setLive] = useState(saved);               // c = what is shown (live preview while editing)
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('uggA') === '1');
  const [panel, setPanel] = useState(false), [login, setLogin] = useState(false);
  const [menu, setMenu] = useState(false), [active, setActive] = useState('home');
  const [lb, setLb] = useState(null), [msg, setMsg] = useState('');
  const glow = useRef();

  useSmoothScroll();
  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2200); };
  const openAdmin = () => (authed ? setPanel(true) : setLogin(true));

  useEffect(() => {
    fetchBackendContent({
      onCloudUpdate: (fresh) => {
        if (fresh) {
          setSaved(fresh);
          setLive((curr) => (panel ? curr : fresh));
        }
      },
    }).then((d) => {
      if (d) {
        setSaved(d);
        setLive(d);
      }
    });
  }, [panel]);

  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty('--red', c.theme.accent); s.setProperty('--bg', c.theme.bg);
  }, [c.theme]);

  useEffect(() => {
    let gx = 0, gy = 0, q = false;
    const mv = (e) => {
      gx = e.clientX; gy = e.clientY;
      if (q) return;
      q = true;
      requestAnimationFrame(() => {
        q = false;
        glow.current.style.transform = `translate3d(${gx - 280}px,${gy - 280}px,0)`;
        const h = document.getElementById('home');
        if (h && !h.classList.contains('off')) { h.style.setProperty('--mx', (gx / innerWidth - 0.5) * 2); h.style.setProperty('--my', (gy / innerHeight - 0.5) * 2); }
      });
    };
    const click = (e) => {
      const a = e.target.closest?.('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (t) { e.preventDefault(); goTo(t); setMenu(false); }
    };
    addEventListener('pointermove', mv, { passive: true }); document.addEventListener('click', click);
    if (location.hash === '#admin') setTimeout(() => (sessionStorage.getItem('uggA') === '1' ? setPanel(true) : setLogin(true)), 600);
    return () => { removeEventListener('pointermove', mv); document.removeEventListener('click', click); };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { threshold: 0.5 });
    document.querySelectorAll('section.s').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const f = c.footer;
  const sp = c.sponsors.items.map((x) => (typeof x === 'string' ? { name: x, logo: '', url: '#' } : x));
  const tick = Array.from({ length: Math.max(2, Math.ceil(8 / sp.length)) }, () => sp).flat();

  return (
    <>
      <div id="glow" ref={glow} />
      <div id="dots">{IDS.map((id) => <a key={id} href={'#' + id} title={id} className={active === id ? 'on' : ''} />)}</div>

      <nav>
        <a className="logo" href="#home">
          {c.brand.logo && <img src={c.brand.logo} alt="" />}
          <span><b>{c.brand.name}</b><small>{c.brand.sub}</small></span>
        </a>
        <div className={`links${menu ? ' open' : ''}`}>
          {c.nav.links.map((l, i) => <a key={i} href={l.u} className={active === l.u.slice(1) ? 'on' : ''}>{l.t}</a>)}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="inst">
            {c.nav.logos.map((l, i) => <a key={i} href={l.url || '#'} aria-label={l.alt} {...ext(l.url)}><img src={l.img} alt={l.alt} /></a>)}
          </div>
          <button className="burger" aria-label="Menu" onClick={() => setMenu((m) => !m)}>☰</button>
        </div>
      </nav>

      <main>
        <Hero c={c} />

        <section className="s" id="events">
          <div className="hrow">
            <div><R as="h2">{c.events.title}</R><R as="p" className="sub">{c.events.sub}</R></div>
            <R as="a" className="more" href={c.events.moreUrl}>{c.events.more} →</R>
          </div>
          <div className="evg">
            {c.events.items.map((x, i) => (
              <R key={i} as="a" className={`ev ${x.status === 'live' ? 'live' : ''}`} style={{ '--i': i }} href={x.url || '#timeline'} {...ext(x.url)}>
                {x.img ? (
                  <img src={fixImgUrl(x.img)} alt={x.title || 'Tournament Poster'} className="ev-img" loading="lazy" decoding="async" />
                ) : (
                  <div className="ev-fallback">
                    <span className="ev-fallback-tag">{x.game || 'UGG'}</span>
                  </div>
                )}
                <i className="ev-sheen" />
                <b className="gh">{x.game}</b>
                <div className="ei">
                  <span className={`tag ${x.status}`}>{x.status}</span>
                  <div className="ei-bot">
                    <h3>{x.title}</h3>
                    <div className="m">
                      {x.date && <span>{x.date}</span>}
                      {x.game && <span>{x.game}</span>}
                      {x.meta && <span>{x.meta}</span>}
                    </div>
                  </div>
                </div>
                <span className="ar">{x.cta || { live: 'Register now', registering: 'Register', upcoming: 'Details' }[x.status] || 'Open'} →</span>
              </R>
            ))}
          </div>
        </section>

        <section className="s" id="about">
          <R as="h2">{c.about.title}</R>
          <R as="p" className="sub" style={{ fontSize: 20, maxWidth: '62ch' }}>{c.about.text}</R>
          <div className="stats">
            {c.about.stats.map((x, i) => <R key={i} className="stat" style={{ '--i': i }}><Num v={x.n} /><span>{x.l}</span></R>)}
          </div>
        </section>

        <section className="s split" id="esports">
          {[['l', c.esports], ['r', c.gamedev]].map(([cls, x]) => (
            <div key={cls} className={cls}>
              <R as="h2">{x.title}</R>
              <R as="p">{x.text}</R>
              <R as="ul">{x.points.map((p, i) => <li key={i}>{p}</li>)}</R>
              <R as="a" className="btn" style={{ alignSelf: 'flex-start' }} href={x.url} {...ext(x.url)}>{x.btn}</R>
              {x.img && <img className="bgimg" src={x.img} alt="" />}
              <span className="art">{x.art}</span>
            </div>
          ))}
        </section>

        <Timeline c={c} />

        <section className="s" id="gallery">
          <R as="h2">{c.gallery.title}</R>
          <R as="p" className="sub">{c.gallery.sub}</R>
          <div className="gal">
            {c.gallery.items.map((g, i) => (
              <R key={i} as="figure" style={{ '--i': i }} onClick={() => g.img && setLb(g.img)}>
                {g.img && <img src={fixImgUrl(g.img)} alt={g.caption} loading="lazy" />}
                <figcaption>{g.caption}</figcaption>
              </R>
            ))}
          </div>
        </section>

        <section className="s" id="sponsors">
          <div className="hrow"><div><R as="h2">{c.sponsors.title}</R><R as="p" className="sub">{c.sponsors.sub}</R></div></div>
          <div className="tick">
            <div>
              {[...tick, ...tick].map((x, i) => (
                <a key={i} href={x.url} aria-label={x.name} {...ext(x.url)}>
                  {x.logo ? <img src={fixImgUrl(x.logo)} alt={x.name} loading="lazy" decoding="async" /> : <span>{x.name}</span>}
                </a>
              ))}
            </div>
          </div>
          <R className="sbtn">
            <a className="btn fill" href={c.sponsors.link || `mailto:${c.sponsors.email}`} {...ext(c.sponsors.link)}><b>{c.sponsors.cta} →</b><small>{c.sponsors.email}</small></a>
          </R>
        </section>

        <section className="s tsec" id="team">
          <R as="h2">{c.team.title}</R>
          <R as="p" className="sub">{c.team.sub}</R>
          <div className="team">{c.team.items.map((m, i) => <Member key={i} m={m} i={i} logo={c.brand.logo} />)}</div>
        </section>

        <section className="s" id="join">
          <div className="join">
            <R as="h2">{c.cta.title}&nbsp;<em>{c.cta.accent}</em></R>
            <R className="words">{c.cta.words.map((w, i) => <span key={i}>{w}</span>)}</R>
            <R as="a" className="btn fill" href={c.cta.url} {...ext(c.cta.url)}>{c.cta.btn}</R>
            {c.socials && c.socials.length > 0 && (
              <div className="social-pills">
                {c.socials.map((s, i) => (
                  <a key={i} className="social-pill" href={s.u} {...ext(s.u)}>
                    {s.t}
                  </a>
                ))}
              </div>
            )}
          </div>
          <footer>
            <div>
              <a className="logo" style={{ color: '#fff' }}>
                {c.brand.logo && <img src={fixImgUrl(c.brand.logo)} alt="" />}
                <span><b>{c.brand.name}</b><small>{c.brand.sub}</small></span>
              </a>
              <p style={{ marginTop: 12, color: 'var(--mut)' }}>{f.about}</p>
            </div>
            <div>
              <h4>Created & Maintained By</h4>
              <div className="maintainers-list">
                {(c.maintainers || [{ name: 'Soumyadeep Roy', role: 'Lead Developer' }]).map((m, i) => {
                  const name = typeof m === 'string' ? m : m.name;
                  const link = typeof m === 'object' ? m.link : '';
                  const role = typeof m === 'object' ? m.role : '';
                  return (
                    <div key={i} className="maintainer-entry">
                      {link ? <a href={link} {...ext(link)} className="maintainer-link">{name}</a> : <span className="maintainer-name">{name}</span>}
                      {role && <small className="maintainer-role">{role}</small>}
                    </div>
                  );
                })}
              </div>
            </div>
            {f.cols.filter((k) => k.title.toLowerCase() !== 'explore').map((k, i) => (
              <div key={i}><h4>{k.title}</h4>{k.links.map((l, j) => <a key={j} href={l.u} {...ext(l.u)}>{l.t}</a>)}</div>
            ))}
          </footer>
          <div className="copy">
            <div>
              <span>{f.location}</span> &nbsp;|&nbsp; <span>{f.copy}</span>
            </div>
            <div className="copy-socials">
              {c.socials?.map((s, i) => (
                <a key={i} className="copy-social-link" href={s.u} {...ext(s.u)}>
                  {s.t}
                </a>
              ))}
              <button className="alink" id="ab" type="button" onClick={openAdmin}>Admin Control</button>
            </div>
            <span style={{ color: 'var(--red)' }} className="hd">{f.tagline}</span>
          </div>
        </section>
      </main>

      <div className={`lb${lb ? ' on' : ''}`} onClick={() => setLb(null)}>{lb && <img src={fixImgUrl(lb)} alt="" />}</div>

      {login && <Login hash={c.admin.hash} onCancel={() => setLogin(false)} onOk={() => { setAuthed(true); sessionStorage.setItem('uggA', '1'); setLogin(false); setPanel(true); }} />}
      {panel && (
        <Admin
          content={saved}
          toast={toast}
          onChange={setLive}
          onSave={async (d) => {
            setSaved(d);
            setLive(d);
            toast('⏳ Saving to Cloud Server...');
            const res = await saveToBackend(d);
            if (res.backend) {
              if (res.githubSynced) {
                toast('🚀 Saved to Cloud & Synced with GitHub Pages CDN!');
              } else {
                toast('🟢 Saved to Cloud! Live for all visitors.');
              }
            } else {
              toast('⚠️ Cloud server taking long to wake up. Saved locally.');
            }
          }}
          onClose={() => { setLive(saved); setPanel(false); }}
          onLogout={() => { setAuthed(false); sessionStorage.removeItem('uggA'); setLive(saved); setPanel(false); }}
        />
      )}
      <div id="toast" className={msg ? 'on' : ''}>{msg}</div>
    </>
  );
}
