/* ==========================================================
   MACHADOXZ — script.js
   ========================================================== */

document.getElementById("year").textContent = new Date().getFullYear();

/* ==========================================================
   1) SOM — sintetizado via Web Audio API (sem precisar de mp3)
   ========================================================== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
let soundOn = true;

function ensureAudio(){
  if(!actx) actx = new AudioCtx();
  if(actx.state === "suspended") actx.resume();
}

function playTone({freq = 440, duration = 0.08, type = "sine", gain = 0.05, glideTo = null}){
  if(!soundOn) return;
  ensureAudio();
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, actx.currentTime);
  if(glideTo){
    osc.frequency.exponentialRampToValueAtTime(glideTo, actx.currentTime + duration);
  }
  g.gain.setValueAtTime(gain, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + duration);
  osc.connect(g).connect(actx.destination);
  osc.start();
  osc.stop(actx.currentTime + duration + 0.02);
}

const sfx = {
  hover: () => playTone({freq: 720, duration: 0.05, type: "sine", gain: 0.03}),
  click: () => playTone({freq: 220, duration: 0.12, type: "triangle", gain: 0.06, glideTo: 440}),
  refresh: () => playTone({freq: 300, duration: 0.18, type: "sawtooth", gain: 0.045, glideTo: 700}),
};

document.querySelectorAll(".snd-hover").forEach(el=>{
  el.addEventListener("mouseenter", sfx.hover);
});
document.querySelectorAll(".snd-click").forEach(el=>{
  el.addEventListener("click", sfx.click);
});

/* toggle geral de som */
const soundToggle = document.getElementById("soundToggle");
const soundIcon   = document.getElementById("soundIcon");
const soundLabel  = document.getElementById("soundLabel");
soundToggle.addEventListener("click", ()=>{
  soundOn = !soundOn;
  soundIcon.textContent  = soundOn ? "🔊" : "🔇";
  soundLabel.textContent = soundOn ? "som" : "mudo";
});

/* ripple visual em qualquer .snd-click */
document.querySelectorAll(".snd-click").forEach(el=>{
  el.style.position = el.style.position || "relative";
  el.style.overflow = "hidden";
  el.addEventListener("click", function(e){
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size/2) + "px";
    ripple.style.top  = (e.clientY - rect.top  - size/2) + "px";
    this.appendChild(ripple);
    setTimeout(()=> ripple.remove(), 650);
  });
});

/* ==========================================================
   2) CURSOR GLOW
   ========================================================== */
const glow = document.getElementById("cursorGlow");
window.addEventListener("pointermove", (e)=>{
  glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
});

/* ==========================================================
   3) SCROLL REVEAL
   ========================================================== */
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("in-view");
      io.unobserve(entry.target);
    }
  });
}, {threshold:0.15});
revealEls.forEach(el=> io.observe(el));

/* ==========================================================
   4) BANCO DE FRASES
   ========================================================== */
const FRASES = [
  { texto: "i'm slowly forgetting your face.", autor: "machado (goat)" },
  { texto: "é que tá dando 3:33, e ela não me deixa ir embora, yeah", autor: "matuê (os melhores)" },
  { texto: "fugi da cena numa STO tipo furiosos e velozes", autor: "matuê (os melhores)" },
  { texto: "quem quer subir não tem medo de cair", autor: "machado (goat)" },
  { texto: "se você desistir de um sonho você vai desistir dele", autor: "machado (goat)" },
  { texto: "mentiroso quem disser que é outro, nós somos os melhores", autor: "matuê (os melhores)" },
  { texto: "eu vou voltar no tempo, só pra reviver o que era antes", autor: "matuê (antes)" },
  { texto: "quem dera eu pudesse voltar como era antes", autor: "matuê (antes)" },
  { texto: "vou mandar um salve pra minha ex (salve)", autor: "matuê e brandão (japonês)" },
  { texto: "você precisa pensar que é o melhor, se não for pra ser assim é melhor ficar em casa", autor: "max verstappen (goat)" },
  { texto: "se vc começar a copiar as pessoas só poderá ser tão bom quanto elas. você não poderá ser melhor!", autor: "max verstappen (goat)" },
  { texto: "vencer é o que importa. o resto é a consequência.", autor: "ayrton senna (goat)" },
  { texto: "em busca da noite perfeita, ela quer conhecer essa onda, ela quer se envolver na onda, ela domina a vida insana", autor: "brandão (noite perfeita)" },
  { texto: "julgamentos rasos nunca vão me definir", autor: "brandão (comigo mesmo)" },
  { texto: "eu só quero fazer o meu máximo, foda-se o meu mínimo, sou só um soldado lutando comigo mesmo (uh, uh)", autor: "brandão (comigo mesmo)" },
];

// frase exclusiva de dia 31 do mês
const FRASE_DIA_31 = { texto: "mulheres — com elas uma encrenca, mas sem elas não se pode viver.", autor: "ayrton senna (goat)" };

/* ==========================================================
   5) SISTEMA "FRASE DO DIA"
   Regra: aleatória, mas nenhuma frase pode ser sorteada
   mais de 2 vezes dentro de um mesmo ciclo. Quando todas já
   bateram o limite, o ciclo reinicia (contadores zerados).
   Guardamos tudo em localStorage para persistir entre visitas.
   ========================================================== */
const LS_KEY_COUNTS = "machadoxz_frase_counts";
const LS_KEY_STATE  = "machadoxz_frase_estado"; // { data: 'YYYY-MM-DD', index, isDia31 }

function loadCounts(){
  try{
    const raw = localStorage.getItem(LS_KEY_COUNTS);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return FRASES.map(()=>0);
}
function saveCounts(counts){
  localStorage.setItem(LS_KEY_COUNTS, JSON.stringify(counts));
}

function pickFraseIndex(){
  let counts = loadCounts();
  if(counts.length !== FRASES.length){
    counts = FRASES.map(()=>0); // banco de frases mudou de tamanho, reseta
  }
  let candidatos = counts
    .map((c, i)=> ({c, i}))
    .filter(o => o.c < 2);

  if(candidatos.length === 0){
    // todas já bateram o limite de 2 -> reinicia o ciclo
    counts = FRASES.map(()=>0);
    candidatos = counts.map((c,i)=>({c,i}));
  }

  const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
  counts[escolhido.i] += 1;
  saveCounts(counts);
  return escolhido.i;
}

function hojeStr(){
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function getFraseDoDia(forcarNova = false){
  const hoje = new Date();
  const ehDia31 = hoje.getDate() === 31;

  let estado = null;
  try{ estado = JSON.parse(localStorage.getItem(LS_KEY_STATE)); }catch(e){}

  if(ehDia31){
    return { frase: FRASE_DIA_31, estado: {data: hojeStr(), index: -1, isDia31: true} };
  }

  if(!forcarNova && estado && estado.data === hojeStr() && !estado.isDia31){
    return { frase: FRASES[estado.index], estado };
  }

  const idx = pickFraseIndex();
  const novoEstado = { data: hojeStr(), index: idx, isDia31: false };
  localStorage.setItem(LS_KEY_STATE, JSON.stringify(novoEstado));
  return { frase: FRASES[idx], estado: novoEstado };
}

function renderFrase(forcarNova = false){
  const { frase } = getFraseDoDia(forcarNova);
  const elTexto = document.getElementById("fraseTexto");
  const elAutor = document.getElementById("fraseAutor");
  elTexto.style.opacity = 0;
  elAutor.style.opacity = 0;
  setTimeout(()=>{
    elTexto.textContent = `"${frase.texto}"`;
    elAutor.textContent = `— ${frase.autor}`;
    elTexto.style.transition = "opacity .4s ease";
    elAutor.style.transition = "opacity .4s ease";
    elTexto.style.opacity = 1;
    elAutor.style.opacity = 1;
  }, 150);
}

renderFrase(false);

document.getElementById("fraseRefresh").addEventListener("click", ()=>{
  sfx.refresh();
  renderFrase(true); // botão "nova frase" força um novo sorteio respeitando o limite de 2x
});

/* ==========================================================
   6) TICKER — fragmentos das frases correndo no topo
   ========================================================== */
const tickerEl = document.getElementById("ticker");
const fragmentos = FRASES.map(f => f.texto.toUpperCase());
const conteudo = [...fragmentos, ...fragmentos] // duplica p/ loop contínuo
  .map(f => `<span class="frag">${f}</span>`)
  .join("");
tickerEl.innerHTML = conteudo;
