(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=1e4;function t(t,n){let r=performance.now()+e,i,a=!0;function o(){if(!a)return;let e=r-performance.now();if(e<=0){a=!1,n();return}let s=Math.ceil(e/1e3);t(s),i=setTimeout(o,e-(s-1)*1e3)}return o(),()=>{a=!1,clearTimeout(i)}}var n=[`hearts`,`diamonds`,`clubs`,`spades`],r=[`A`,`2`,`3`,`4`,`5`,`6`,`7`,`8`,`9`,`10`,`J`,`Q`,`K`],i=7,a=8,o=[1,2,3,5,10],s=100;function c(e=Math.random){let t=n.flatMap(e=>r.map(t=>({id:`${t}-${e}`,suit:e,rank:t}))),a=t.filter(e=>e.rank===`A`),c=t.filter(e=>e.rank!==`A`),l={hearts:0,diamonds:0,clubs:0,spades:0};for(let t=0;t<s;t++){let t=[...c];for(let n=t.length-1;n>0;n--){let r=e();if(!(r>=0&&r<1))throw RangeError(`Random source must return a number in [0, 1).`);let i=Math.floor(r*(n+1));[t[n],t[i]]=[t[i],t[n]]}let r=t.slice(0,i),s={...l};for(let e of r)s[e.suit]++;if(n.some(e=>s[e]>=o.length))continue;let u={...l};for(let e of n)u[e]=o[s[e]];return{aces:a,links:r,stock:t.slice(i),positions:l,profitOdds:u}}throw Error(`Could not deal a valid track after ${s} attempts.`)}function l(e){return{...e,phase:`betting`,history:[],winner:null}}function u(e){if(e.phase!==`betting`)throw Error(`A race can only start during table betting.`);return{...e,phase:`racing`}}function d(e){if(e.phase!==`racing`)throw Error(`Cards can only be drawn during an active race.`);let t=e.stock[0];if(!t)throw Error(`Invalid race state: the draw pile ran out before a racer finished.`);let n={...e.positions};n[t.suit]++;let r={...e,positions:n,stock:e.stock.slice(1),history:[...e.history,t]};return n[t.suit]===a?{...r,phase:`results`,winner:t.suit}:r}var f={hearts:{label:`Hearts`,symbol:`♥`,creature:`Reindeer`,art:`
      <path d="M24 30 17 19 16 9m4 14-9-2m8-2 6-6m15 17 7-11 1-10m-4 14 9-2m-8-2-6-6"
        fill="none" stroke="#744026" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M25 33Q12 35 12 24q10-3 16 4m11 5q13 2 13-9-10-3-16 4" fill="#b66a3b"/>
      <path d="M18 57q2-13 14-13t14 13" fill="#187b62"/>
      <ellipse cx="32" cy="38" rx="15" ry="14" fill="#b66a3b"/>
      <ellipse cx="32" cy="44" rx="9" ry="7" fill="#f4cf9d"/>
      <path d="M26 36h.1m11.8 0h.1" stroke="#301c19" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="32" cy="42" r="4" fill="#b21f3e"/>
    `},diamonds:{label:`Diamonds`,symbol:`♦`,creature:`Snowman`,art:`
      <circle cx="32" cy="46" r="14" fill="#e4f7ff"/>
      <circle cx="32" cy="31" r="13" fill="#fffdf4"/>
      <path d="m18 23 5-14 17 1 5 13z" fill="#192d48"/>
      <path d="M22 19h20v4H22z" fill="#bd2b4b"/>
      <path d="M16 24h32" stroke="#192d48" stroke-width="4" stroke-linecap="round"/>
      <path d="M27 30h.1m9.8 0h.1m-5 17h.1m-.1 7h.1" stroke="#192d48" stroke-width="3.5" stroke-linecap="round"/>
      <path d="m31 33 12 3-12 2z" fill="#da691c"/>
      <path d="M20 42q12 4 24 0m-6 2 1 8" fill="none" stroke="#bd2b4b" stroke-width="5" stroke-linecap="round"/>
    `},clubs:{label:`Clubs`,symbol:`♣`,creature:`Elf`,art:`
      <path d="M17 59q0-14 15-14t15 14" fill="#13745b"/>
      <path d="m22 32-12-4 7 12 7 1m18-9 12-4-7 12-7 1" fill="#d99160"/>
      <ellipse cx="32" cy="36" rx="14" ry="14" fill="#e9ac75"/>
      <path d="M16 30Q20 8 46 8l-6 13 8 8z" fill="#14765e"/>
      <path d="m16 29 30-4 2 5-31 5z" fill="#bd2b4b"/>
      <circle cx="46" cy="8" r="4" fill="#e3ae40"/>
      <path d="M27 37h.1m9.8 0h.1m-8 5q3 3 6 0" fill="none" stroke="#392520" stroke-width="2.5" stroke-linecap="round"/>
      <path d="m24 49 8 7 8-7" fill="none" stroke="#fff0c5" stroke-width="3"/>
    `},spades:{label:`Spades`,symbol:`♠`,creature:`Polar bear`,art:`
      <path d="M15 58q1-15 17-15t17 15" fill="#e2f3f7"/>
      <circle cx="19" cy="23" r="7" fill="#fffdf4"/>
      <circle cx="45" cy="23" r="7" fill="#fffdf4"/>
      <circle cx="19" cy="23" r="3.5" fill="#abc7d7"/>
      <circle cx="45" cy="23" r="3.5" fill="#abc7d7"/>
      <ellipse cx="32" cy="36" rx="18" ry="15" fill="#fffdf4"/>
      <ellipse cx="32" cy="40" rx="9" ry="6" fill="#dcecf1"/>
      <path d="M26 34h.1m11.8 0h.1m-8 4 2 2 2-2z" fill="#17283e" stroke="#17283e" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M19 49q13 4 26 0m-5 2 1 8" fill="none" stroke="#34699d" stroke-width="5" stroke-linecap="round"/>
    `}};function p(e){return`<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${f[e].art}</svg>`}function m(e){let{label:t,symbol:n}=f[e.suit];return`<span class="race-card" data-suit="${e.suit}" role="img" aria-label="${e.rank} of ${t}">
    ${e.rank} <span>${n}</span>
  </span>`}function h(e,t,n=!1){let{label:r,creature:i}=f[e],a=n?`track-marker marker-moved`:`track-marker`;return t?`<img class="${a}" src="${t}" alt="${r} racer photo" />`:`<span class="${a}" role="img" aria-label="${i}">${p(e)}</span>`}function g(e,t){let r=e.links.length+1,i=e.history.at(-1),a=e.winner,o={betting:`Table betting`,racing:`Race in progress`,results:`Race finished`}[e.phase];return`
    <header class="race-heading">
      <h2 id="track-title" tabindex="-1">Race track</h2>
      <p class="phase-badge" data-phase="${e.phase}">${o}</p>
    </header>
    <dl class="race-status">
      <div>
        <dt>Last card</dt>
        <dd>${i?`
          ${m(i)}
          <span class="draw-call">${f[i.suit].label} → ${a?`Finish`:`Link ${e.positions[i.suit]}`}</span>
        `:`—`}</dd>
      </div>
      <div><dt>Next draw</dt><dd id="draw-countdown">—</dd></div>
      <div class="race-result${a?` winner-revealed`:``}">
        <dt>${a?`North Pole champion`:`Winner`}</dt>
        <dd id="race-winner">${a?`
          ${h(a,t[a])}
          <span><span aria-hidden="true">${f[a].symbol}</span> ${f[a].label} wins!</span>
        `:`—`}</dd>
      </div>
    </dl>
    <p class="track-scroll-hint">Scroll across to see the full track.</p>
    <div class="track-scroll" role="region" aria-label="Race lanes and track cards" tabindex="0">
      <table class="race-track">
        <thead>
          <tr>
            <th scope="col" class="lane-label">Racer · Odds</th>
            <th scope="col" class="track-start">Start</th>
            ${e.links.map((e,t)=>`
              <th scope="col" class="track-link">
                <span>Link ${t+1}</span>
                ${m(e)}
              </th>
            `).join(``)}
            <th scope="col" class="track-finish">Finish</th>
          </tr>
        </thead>
        <tbody>
          ${n.map(n=>`
            <tr data-suit="${n}"${e.winner===n?` class="winning-lane"`:``}>
              <th scope="row" class="lane-label">
                <span class="lane-suit" aria-hidden="true">${f[n].symbol}</span>
                ${f[n].label}
                <span class="lane-odds">${e.profitOdds[n]}:1</span>
              </th>
              ${Array.from({length:r+1},(a,o)=>`
                <td class="${o===0?`track-start`:o===r?`track-finish`:`track-step`}">
                  ${o===e.positions[n]?h(n,t[n],i?.suit===n):``}
                </td>
              `).join(``)}
            </tr>
          `).join(``)}
        </tbody>
      </table>
    </div>
  `}var _=document.querySelector(`#app`);if(!_)throw Error(`Missing app element`);_.innerHTML=`
  <main>
    <header class="broadcast-header">
      <p class="broadcast-label"><span aria-hidden="true">✦</span> North Pole Racing</p>
      <h1>Xmas <span>Madness</span></h1>
    </header>
    <p id="race-announcement" class="sr-only" role="status" aria-atomic="true"></p>
    <section class="photo-setup" aria-labelledby="setup-title">
      <h2 id="setup-title">Set up the racers</h2>
      <p>Choose a photo for each suit or race with its Christmas creature.</p>
      <div class="racer-grid"></div>
      <button class="host-action" type="button" id="deal-track">Deal track</button>
      <p class="photo-error" id="deal-error" role="alert"></p>
    </section>
    <section class="race-view" aria-labelledby="track-title" hidden>
      <div class="race-board"></div>
      <button class="host-action" type="button" id="start-race" hidden>Start race</button>
      <button class="host-action" type="button" id="edit-racers">Back to racer setup</button>
      <button class="host-action" type="button" id="new-race" hidden>New race</button>
    </section>
  </main>
`;var v=_.querySelector(`.racer-grid`),y=_.querySelector(`.photo-setup`),b=_.querySelector(`.race-view`),x=_.querySelector(`.race-board`),S=_.querySelector(`#deal-track`),C=_.querySelector(`#deal-error`),w=_.querySelector(`#edit-racers`),T=_.querySelector(`#start-race`),E=_.querySelector(`#new-race`),D=_.querySelector(`#race-announcement`);if(!v||!y||!b||!x||!S||!C||!w||!T||!E||!D)throw Error(`Missing race screen controls`);var O={},k={},A=()=>{S.disabled=Object.keys(k).length>0};v.append(...n.map(I));var j=null,M,N=e=>{let t=x.querySelector(`.track-scroll`),n=t?.scrollLeft??0,r=t!==null&&document.activeElement===t;x.innerHTML=g(e,O);let i=x.querySelector(`.track-scroll`);i&&(i.scrollLeft=n,r&&i.focus({preventScroll:!0}));let a=x.querySelector(`.marker-moved`),o=a?.closest(`td`),s=o?.previousElementSibling;if(a&&o&&s){let e=s.getBoundingClientRect(),t=o.getBoundingClientRect(),n=e.left+e.width/2-(t.left+t.width/2);a.style.setProperty(`--move-from`,`${n}px`)}T.hidden=w.hidden=e.phase!==`betting`,E.hidden=e.phase!==`results`},P=e=>{let n=x.querySelector(`#draw-countdown`);M=t(e=>{n&&(n.textContent=`${e}s`)},()=>{if(j!==e)return;M=void 0,j=d(e),N(j);let t=j.history.at(-1);if(t){let e=f[t.suit].label,n=j.winner?`${e} crosses the finish and wins!`:`${e} advances to link ${j.positions[t.suit]}.`;D.textContent=`${t.rank} of ${e}. ${n}`}j.phase===`racing`&&P(j)})};S.addEventListener(`click`,()=>{if(!(j||S.disabled)){C.textContent=``;try{j=l(c())}catch{C.textContent=`The track could not be dealt. Try Deal track again.`;return}N(j),y.hidden=!0,b.hidden=!1,x.querySelector(`#track-title`)?.focus()}}),T.addEventListener(`click`,()=>{j?.phase===`betting`&&(j=u(j),N(j),D.textContent=`Race started. First draw in 10 seconds.`,x.querySelector(`.track-scroll`)?.focus({preventScroll:!0}),P(j))});var F=()=>{M?.(),M=void 0,j=null,D.textContent=``,b.hidden=!0,x.replaceChildren(),y.hidden=!1,S.focus()};w.addEventListener(`click`,()=>{j?.phase===`betting`&&F()}),E.addEventListener(`click`,()=>{j?.phase===`results`&&F()});function I(e){let{label:t,symbol:n,creature:r}=f[e],i=document.createElement(`section`);i.className=`racer-slot`,i.setAttribute(`aria-labelledby`,`${e}-title`),i.innerHTML=`
    <h3 id="${e}-title"><span aria-hidden="true">${n}</span> ${t}</h3>
    <div class="racer-preview">
      <div class="racer-creature">
        ${p(e)}
        ${r}
      </div>
      <img alt="${t} racer photo" hidden />
    </div>
    <label for="${e}-photo">${t} photo</label>
    <input id="${e}-photo" type="file" accept="image/*" aria-describedby="${e}-error" />
    <button type="button" aria-label="Clear ${t} photo" disabled>Clear photo</button>
    <p class="photo-error" id="${e}-error" role="alert"></p>
  `;let a=i.querySelector(`input`),o=i.querySelector(`button`),s=i.querySelector(`img`),c=i.querySelector(`.racer-creature`),l=i.querySelector(`.photo-error`);if(!a||!o||!s||!(c instanceof HTMLElement)||!l)throw Error(`Missing racer photo controls`);return a.addEventListener(`change`,async()=>{let t=a.files?.[0];if(!t)return;a.value=``,l.textContent=``;let n=k[e];n&&URL.revokeObjectURL(n);let r=URL.createObjectURL(t);k[e]=r,A();let i=new Image;i.src=r;try{await i.decode()}catch{if(k[e]!==r)return;URL.revokeObjectURL(r),delete k[e],A(),l.textContent=`This file could not be opened as an image. Try a PNG or JPEG photo.`;return}if(k[e]!==r)return;delete k[e],A();let u=O[e];u&&URL.revokeObjectURL(u),O[e]=r,s.src=r,s.hidden=!1,c.hidden=!0,o.disabled=!1}),o.addEventListener(`click`,()=>{let t=k[e],n=O[e];t&&URL.revokeObjectURL(t),n&&URL.revokeObjectURL(n),delete k[e],delete O[e],A(),s.removeAttribute(`src`),s.hidden=!0,c.hidden=!1,o.disabled=!0,l.textContent=``,a.focus()}),i}