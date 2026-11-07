// xoshiro128** 1.1 and 2^64 jump: Blackman/Vigna, public domain.
// https://prng.di.unimi.it/xoshiro128starstar.c
export function makeRandom(seed=20261101,worker=0) {
  let x=seed>>>0;
  const mix=()=>{x=(x+0x9e3779b9)>>>0;let z=x;z=Math.imul(z^(z>>>16),0x21f0aaad);z=Math.imul(z^(z>>>15),0x735a2d97);return (z^(z>>>15))>>>0;};
  let a=mix(),b=mix(),c=mix(),d=mix(),calls=0;
  const rot=(v,k)=>(v<<k|v>>>(32-k))>>>0;
  const next=()=>{const r=Math.imul(rot(Math.imul(b,5),7),9)>>>0,t=b<<9;c^=a;d^=b;b^=c;a^=d;c^=t;d=rot(d,11);a>>>=0;b>>>=0;c>>>=0;d>>>=0;calls++;return r/0x100000000;};
  for(let j=0;j<worker;j++){
    let aa=0,bb=0,cc=0,dd=0;
    for(const jump of [0x8764000b,0xf542d2d3,0x6fa035c3,0x77f2db5b])for(let bit=0;bit<32;bit++){
      if((jump&(1<<bit))!==0){aa^=a;bb^=b;cc^=c;dd^=d;}next();
    }
    a=aa>>>0;b=bb>>>0;c=cc>>>0;d=dd>>>0;calls=0;
  }
  next.state=()=>[a,b,c,d,calls];return next;
}
