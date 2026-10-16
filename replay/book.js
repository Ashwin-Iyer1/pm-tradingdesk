// Normalized fixture protocol, not a live exchange WebSocket adapter.
const validNumber=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const tick=p=>{if(!validNumber(p,.0001,.9999)||Math.abs(p*10000-Math.round(p*10000))>1e-7)throw Error('Price must be $0.0001–$0.9999 at four-decimal precision.');return Math.round(p*10000);};
const quantity=q=>{if(!validNumber(q,0,1e7)||Math.abs(q*100-Math.round(q*100))>1e-7)throw Error('Quantity must have at most two decimals.');return Math.round(q*100);};
export function emptyBook(){return{yes:new Map(),no:new Map(),seq:null,time:null,synced:false,reason:'Awaiting a snapshot'};}
export function applyEvent(book,event){
 if(!event||!Number.isInteger(event.seq)||event.seq<0||!validNumber(event.time,0,1e12))throw Error('Invalid event sequence or replay time.');
 if(event.type==='snapshot'){
   const next={yes:new Map(),no:new Map(),seq:event.seq,time:event.time,synced:true,reason:'Snapshot synchronized'};
   for(const side of ['yes','no']){if(!Array.isArray(event[side]))throw Error('Snapshot requires both bid sides.');for(const [p,q]of event[side]){const t=tick(p),units=quantity(q);if(next[side].has(t))throw Error('Duplicate snapshot level.');if(units)next[side].set(t,units);}}
   return next;
 }
 if(event.type!=='delta'||!['yes','no'].includes(event.side)||!Number.isFinite(event.change))throw Error('Invalid delta.');
 if(event.seq<=book.seq)return{...book,reason:'Duplicate/old delta ignored'};
 if(!book.synced||event.seq!==book.seq+1||event.time<book.time)return{...book,synced:false,reason:'Sequence gap or time reversal: snapshot required'};
 const price=tick(event.price),change=Math.sign(event.change)*quantity(Math.abs(event.change)),levels=new Map(book[event.side]),updated=(levels.get(price)||0)+change;
 if(updated<0)return{...book,synced:false,reason:'Negative level: snapshot required'};
 if(updated)levels.set(price,updated);else levels.delete(price);
 return{...book,[event.side]:levels,seq:event.seq,time:event.time,reason:'Contiguous delta applied'};
}
export function ladder(book,side='yes'){
 if(!['yes','no'].includes(side))throw Error('Side must be yes or no.');
 const bids=[...book[side]].sort((a,b)=>b[0]-a[0]).map(([p,q])=>({price:p/10000,quantity:q/100}));
 const asks=[...book[side==='yes'?'no':'yes']].map(([p,q])=>({price:(10000-p)/10000,quantity:q/100})).sort((a,b)=>a.price-b.price);
 return{bids,asks,spread:bids.length&&asks.length?asks[0].price-bids[0].price:null};
}
export function preview(book,{side='yes',count=10,limit=1,now=book.time,maxAge=5}={}){
 if(!book.synced)throw Error('Book is unsynchronized. Apply a recovery snapshot.');
 if(!validNumber(now,book.time,1e12)||now-book.time>maxAge)throw Error('Book is stale. Refresh the snapshot.');
 const requested=quantity(count);if(!requested)throw Error('Requested contracts must be positive.');if(!validNumber(limit,0,1))throw Error('Limit must be between $0 and $1.');
 const depth=ladder(book,side);if(depth.spread!==null&&depth.spread<0)throw Error('Crossed book: refresh before analysis.');
 let remaining=requested,costUnits=0;const fills=[];
 for(const level of depth.asks){if(level.price>limit+1e-12)break;const filled=Math.min(remaining,Math.round(level.quantity*100));if(filled){costUnits+=filled*Math.round(level.price*10000);fills.push({price:level.price,quantity:filled/100});remaining-=filled;}if(!remaining)break;}
 const filled=(requested-remaining)/100,cost=costUnits/1e6;return{requested:count,filled,unfilled:remaining/100,cost,average:filled?cost/filled:null,payoutIfWins:filled,payoutIfLoses:0,netIfWins:filled-cost,netIfLoses:-cost,fills};
}
