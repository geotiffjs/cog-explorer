(this.webpackJsonp=this.webpackJsonp||[]).push([[3],{484:function(t,e,n){"use strict";function r(t,e){let n=t.length-e,r=0;do{for(let n=e;n>0;n--)t[r+e]+=t[r],r++;n-=e}while(n>0)}function o(t,e,n){let r=0,o=t.length;const i=o/n;for(;o>e;){for(let n=e;n>0;--n)t[r+e]+=t[r],++r;o-=e}const s=t.slice();for(let e=0;e<i;++e)for(let r=0;r<n;++r)t[n*e+r]=s[(n-r-1)*i+e]}n.d(e,"a",(function(){return i}));class i{async decode(t,e){const n=await this.decodeBlock(e),i=t.Predictor||1;if(1!==i){const e=!t.StripOffsets;return function(t,e,n,i,s,c){if(!e||1===e)return t;for(let t=0;t<s.length;++t){if(s[t]%8!=0)throw new Error("When decoding with predictor, only multiple of 8 bits are supported.");if(s[t]!==s[0])throw new Error("When decoding with predictor, all samples must have the same size.")}const l=s[0]/8,f=2===c?1:s.length;for(let c=0;c<i&&!(c*f*n*l>=t.byteLength);++c){let i;if(2===e){switch(s[0]){case 8:i=new Uint8Array(t,c*f*n*l,f*n*l);break;case 16:i=new Uint16Array(t,c*f*n*l,f*n*l/2);break;case 32:i=new Uint32Array(t,c*f*n*l,f*n*l/4);break;default:throw new Error(`Predictor 2 not allowed with ${s[0]} bits per sample.`)}r(i,f)}else 3===e&&(i=new Uint8Array(t,c*f*n*l,f*n*l),o(i,f,l))}return t}(n,i,e?t.TileWidth:t.ImageWidth,e?t.TileLength:t.RowsPerStrip||t.ImageLength,t.BitsPerSample,t.PlanarConfiguration)}return n}}},488:function(t,e,n){"use strict";n.r(e),n.d(e,"default",(function(){return s}));var r=n(484);function o(t,e){for(let n=e.length-1;n>=0;n--)t.push(e[n]);return t}function i(t){const e=new Uint16Array(4093),n=new Uint8Array(4093);for(let t=0;t<=257;t++)e[t]=4096,n[t]=t;let r=258,i=9,s=0;function c(){r=258,i=9}function l(t){const e=function(t,e,n){const r=e%8,o=Math.floor(e/8),i=8-r,s=e+n-8*(o+1);let c=8*(o+2)-(e+n);const l=8*(o+2)-e;if(c=Math.max(0,c),o>=t.length)return console.warn("ran off the end of the buffer before finding EOI_CODE (end on input code)"),257;let f=t[o]&2**(8-r)-1;f<<=n-i;let a=f;if(o+1<t.length){let e=t[o+1]>>>c;e<<=Math.max(0,n-l),a+=e}if(s>8&&o+2<t.length){const r=8*(o+3)-(e+n);a+=t[o+2]>>>r}return a}(t,s,i);return s+=i,e}function f(t,o){return n[r]=o,e[r]=t,r++,r-1}function a(t){const r=[];for(let o=t;4096!==o;o=e[o])r.push(n[o]);return r}const u=[];c();const h=new Uint8Array(t);let d,w=l(h);for(;257!==w;){if(256===w){for(c(),w=l(h);256===w;)w=l(h);if(257===w)break;if(w>256)throw new Error("corrupted code at scanline "+w);o(u,a(w)),d=w}else if(w<r){const t=a(w);o(u,t),f(d,t[t.length-1]),d=w}else{const t=a(d);if(!t)throw new Error(`Bogus entry. Not in dictionary, ${d} / ${r}, position: ${s}`);o(u,t),u.push(t[t.length-1]),f(d,t[t.length-1]),d=w}r+1>=2**i&&(12===i?d=void 0:i++),w=l(h)}return new Uint8Array(u)}class s extends r.a{decodeBlock(t){return i(t).buffer}}}}]);
//# sourceMappingURL=3.app.bundle.js.map