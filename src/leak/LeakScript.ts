import { LEAK } from './LeakMeter.js';
import { APPARITION, AWAKE_INK } from './LeakStyle.js';

/** Maximum size of the inline leak script (NFR: ≤ 1.5 KB). `DistGuard` adds it to every awake page's budget. */
export const LEAK_SCRIPT_BUDGET = 1536;

/**
 * The tiny inline script in the `<head>` of every awake page (FR2, FR6).
 * Before first paint it reads the stored leak (`LeakMeter`'s record), works
 * out the level and the capped background exactly like `LeakMeter.level`
 * and `LeakStyle.of` (a unit test runs both on random records), and sets
 * `--leak-bg`, `--leak-color` and `--leak-level` on `<html>` for the
 * `@layer leak`; it marks `<html data-leak-apparition>` when
 * `LeakStyle.appears` would. Only colours change, so nothing moves (no
 * layout shift). On the legal page it shows "Clear the leak"
 * (`[data-leak-clear]`) and, on a press, removes the record and the stain
 * and writes the `data-text` of `[data-leak-cleared]` (a polite status
 * region) into it.
 *
 * The stored cap is the one the world computed with `LeakStyle.cap`; the
 * script only clamps it to `LEAK.maxMix`. Damaged records or blocked
 * storage are reported in the console and leave the page unstained.
 *
 * The constants are written in from `LeakMeter` / `LeakStyle`, so the two
 * cannot drift apart.
 *
 * @returns JavaScript source (expects `document`, `window`, `Math`, `Date`, `console`).
 */
export function leakScript(): string {
  const ink = AWAKE_INK.slice(1);
  return (
    '(function(){var d=document,h=d.documentElement,K=' +
    JSON.stringify(LEAK.key) +
    ',P=["--leak-bg","--leak-color","--leak-level"],W=function(e){console.warn("[leak]",e)};' +
    'try{var r=JSON.parse(window.localStorage.getItem(K)||"null");if(r){' +
    `var m=r.ms*Math.pow(2,-Math.max(Date.now()-r.at,0)/${LEAK.halfLifeMs}),x=Math.min(m/${LEAK.saturateMs},1),l=m>0?x*x:0,` +
    `c=/^#[0-9a-f]{6}$/.test(r.color)?r.color:"#${ink}",M=${LEAK.maxMix},` +
    't=Math.floor(Math.min(l*M,Math.min(Math.max(+r.cap||0,0),M))*100+1e-9)/100,b="#",i,a,z;' +
    `for(i=1;i<7;i+=2){a=parseInt("${AWAKE_INK}".slice(i,i+2),16);z=parseInt(c.slice(i,i+2),16);b+=(256|Math.round(a+(z-a)*t)).toString(16).slice(1)}` +
    'h.style.setProperty(P[0],b);h.style.setProperty(P[1],c);h.style.setProperty(P[2],String(l));' +
    `if(l>=${APPARITION.minLevel}&&Math.random()<${APPARITION.chance}*l)h.setAttribute("data-leak-apparition","")` +
    '}}catch(e){W(e)}' +
    'd.addEventListener("DOMContentLoaded",function(){var b=d.querySelector("[data-leak-clear]");if(b)b.hidden=false});' +
    'd.addEventListener("click",function(e){if(!e.target.closest("[data-leak-clear]"))return;' +
    'try{window.localStorage.removeItem(K)}catch(e){W(e);return}' +
    'P.forEach(function(p){h.style.removeProperty(p)});h.removeAttribute("data-leak-apparition");' +
    'var s=d.querySelector("[data-leak-cleared]");if(s)s.textContent=s.getAttribute("data-text")})})()'
  );
}
