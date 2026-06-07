let tableOpen = false;
let huntOpen = false;
let quickRankOpen = false;
let last = null;
let currentScore = 0;
let currentVerdict = 'Enter costs';
let deals = [];
const DEAL_KEY = 'threadfound_radar_pro_deals_v1';

const moneyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const numFormatter = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
function $(id){return document.getElementById(id)}
function esc(str){return String(str ?? '').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
function money(n){return moneyFormatter.format(Number.isFinite(Number(n)) ? Number(n) : 0)}
function nums(str){return (String(str||'').match(/\d+(?:\.\d+)?/g)||[]).map(Number)}
function firstMoney(str){const n=nums(str);return n[0]||0}
function minMoney(str){const n=nums(str);return n.length?Math.min(...n):0}
function maxMoney(str){const n=nums(str);return n.length?Math.max(...n):0}
function cleanClass(v){return String(v||'').replace(/\s+/g,'-')}
function badge(v){return `<span class="badge ${esc(cleanClass(v))}">${esc(v)}</span>`}
function riskBadge(v){return `<span class="badge ${esc(cleanClass(v+'-risk'))}">${esc(v)} risk</span>`}
function productKey(product){return productMeta[product] ? product : Object.keys(productMeta).find(x => product.includes(x)) || product}
function metaFor(product){return productMeta[productKey(product)] || {category:'Other',risk:'Medium',bestFor:'Research',speed:'Medium',icon:'£',avoid:'Check exact model and condition.',tip:'Check current sold prices before buying.'}}
function confidenceScore(conf){return {High:3,Medium:2,Low:1}[conf]||0}
function riskScore(risk){return {Low:1,Medium:2,High:3}[risk]||0}
function checkedText(product){return productChecked[productKey(product)] || '6 June 2026'}
function checkedDate(product){return new Date(checkedText(product)+'T00:00:00')}
function daysSinceChecked(product){const checked=checkedDate(product); if(Number.isNaN(checked.getTime())) return null; return Math.floor((new Date()-checked)/(1000*60*60*24))}
function sourceSummary(row){const notes=String(row.Notes||''); const sources=[]; if(/CeX/i.test(notes)) sources.push('CeX'); if(/Back Market/i.test(notes)) sources.push('Back Market'); if(/Cash Converters/i.test(notes)) sources.push('Cash Converters'); if(/eBay/i.test(notes)) sources.push('eBay sold/used examples'); if(/Facebook|local|Hereford|Ledbury/i.test(notes)) sources.push('local asking prices'); if(/MusicMagpie/i.test(notes)) sources.push('MusicMagpie'); return sources.length ? `Based on: ${[...new Set(sources)].join(', ')}` : 'Based on: stored guide notes and condition assumptions.'}
function updateGuideTrust(row){if(!$('priceCheckedOut')) return; const days=daysSinceChecked(row.Product); const checked=checkedText(row.Product); $('priceCheckedOut').textContent=checked; $('priceConfidenceOut').innerHTML=badge(row.Confidence); $('priceSourcesOut').textContent=sourceSummary(row); const freshness=$('priceFreshnessOut'); if(days===null){freshness.className='notice'; freshness.textContent='Could not read the guide date. Recheck this item before buying.'} else if(days>30){freshness.className='notice danger-note'; freshness.textContent=`Review this guide before buying. It was checked ${days} days ago.`} else {freshness.className='notice success'; freshness.textContent=days===0?'Fresh guide: checked today.':`Fresh guide: checked ${days} day${days===1?'':'s'} ago.`}}

function defaultSellingCost(row){if(row.category==='Phone')return 11;if(row.category==='Console')return row.Product.includes('Switch')?9:6;if(row.category==='Wearable'||row.category==='Earbuds')return 7;return 5}
function roundDown(n){return Math.max(0, Math.floor(Number(n)||0))}
function clamp(n,min,max){return Math.min(max,Math.max(min,n))}

const enrichedRows = rows.map(row=>{
  const meta=metaFor(row.Product);
  return {...row, category:meta.category, risk:meta.risk, bestFor:meta.bestFor, speed:meta.speed, icon:meta.icon, avoid:meta.avoid, tip:meta.tip,
    realistic:firstMoney(row['Most accurate resale price']), resaleLow:minMoney(row['Realistic resale price range']), resaleHigh:maxMoney(row['Realistic resale price range']),
    minBuy:minMoney(row['Recommended buy-in range']), targetBuyHigh:maxMoney(row['Recommended buy-in range']), maxBuy:firstMoney(row['Max buy-in price']),
    confidenceScore:confidenceScore(row.Confidence), riskScore:riskScore(meta.risk)};
});

function currentRow(){const p=$('product').value; const g=$('gradeSelect').value; return enrichedRows.find(r=>r.Product===p&&r.Grade===g) || enrichedRows[0]}
function platformValues(){const p=$('platform').value; const preset=platformPresets[p]||platformPresets.Custom; return {platform:p, feePct:(Number($('platformFee').value)||0)/100, fixedFee:Number($('fixedFee').value)||0, note:preset.note}}
function guideValuation(row){return {realistic:row.realistic, resaleLow:row.resaleLow, resaleHigh:row.resaleHigh}}
function requiredIndexes(row){const key=productKey(row.Product); const meta=metaFor(key); const checks=productChecklists[key]||[]; let count=2; if(meta.risk==='High') count=5; else if(['Phone','Wearable','Earbuds'].includes(meta.category)) count=4; else if(meta.risk==='Medium') count=3; return checks.map((_,i)=>i).slice(0, Math.min(count, checks.length))}
function checkStats(row){const boxes=[...document.querySelectorAll('#checklistBox input')]; const done=boxes.filter(b=>b.checked).length; const req=requiredIndexes(row); const reqDone=req.filter(i=>boxes[i]&&boxes[i].checked).length; return {boxes,done,total:boxes.length,req,reqDone,reqTotal:req.length,locked:req.length>0 && reqDone<req.length}}
function scoreCapFor(row){const meta=metaFor(row.Product); if(meta.risk==='High') return 68; if(['Phone','Wearable','Earbuds'].includes(meta.category)) return 74; if(meta.risk==='Medium') return 82; return 100}
function projectedNumbers(row,total,valuation){const platform=platformValues(); const plannedSell=Number($('sellPrice').value)||valuation.realistic; const selling=Number($('sellingCosts').value)||defaultSellingCost(row); const fee=plannedSell*platform.feePct+platform.fixedFee; const profit=plannedSell-total-selling-fee; const roi=total>0?profit/total*100:0; return {plannedSell,selling,fee,profit,roi}}
function calculateDealScore(row,total,valuation){
  if(total<=0) return {score:0, cap:100, raw:0, locked:false};
  const checks=checkStats(row); const p=projectedNumbers(row,total,valuation); let score=48;
  if(total<=row.minBuy) score+=24; else if(total<=row.targetBuyHigh) score+=18; else if(total<=row.maxBuy) score+=8; else if(total<=row.maxBuy*1.1) score-=10; else score-=28;
  if(p.profit>=35) score+=16; else if(p.profit>=20) score+=12; else if(p.profit>=10) score+=6; else if(p.profit>0) score+=1; else score-=22;
  if(p.roi>=45) score+=12; else if(p.roi>=30) score+=8; else if(p.roi>=20) score+=4; else if(p.roi>0) score-=2; else score-=12;
  if(row.Confidence==='High') score+=7; else if(row.Confidence==='Medium') score+=2; else score-=5;
  if(row.risk==='Low') score+=8; else if(row.risk==='High') score-=12;
  if(row.speed==='Fast') score+=5;
  if(checks.total && checks.done/checks.total>=0.8) score+=4;
  let cap=checks.locked ? scoreCapFor(row) : 100;
  const raw=clamp(Math.round(score),0,100);
  return {score:Math.min(raw,cap), cap, raw, locked:checks.locked};
}
function verdictFromScore(score, locked, total){if(total<=0)return {label:'Enter your costs', klass:'decision maybe'}; if(locked&&score>=60)return {label:'Checks needed', klass:'decision locked'}; if(score>=85)return {label:'Strong buy', klass:'decision good'}; if(score>=70)return {label:'Good buy', klass:'decision good'}; if(score>=55)return {label:'Negotiate / maybe', klass:'decision maybe'}; return {label:'Avoid', klass:'decision bad'}}
function quickScore(row){const profit=row.realistic-row.maxBuy-defaultSellingCost(row); let score=profit*2 + (row.realistic?profit/row.realistic*100:0); if(row.risk==='Low')score+=22; if(row.risk==='Medium')score+=8; if(row.risk==='High')score-=16; if(row.Confidence==='High')score+=20; if(row.Confidence==='Medium')score+=8; if(row.speed==='Fast')score+=12; return Math.round(score)}

function init(){
  const products=[...new Set(rows.map(r=>r.Product))];
  $('product').innerHTML=products.map(p=>`<option>${esc(p)}</option>`).join('');
  $('platform').innerHTML=Object.keys(platformPresets).map(p=>`<option>${esc(p)}</option>`).join('');
  $('dealDate').value=new Date().toISOString().slice(0,10);
  loadDeals(); bind(); loadGuide(); renderDashboard();
}
function loadGuide(){
  const row=currentRow();
  $('sellPrice').value=row.realistic;
  $('sellingCosts').value=defaultSellingCost(row);
  $('guideNote').textContent=`${row.Product} ${row.Grade}: buy target ${row['Recommended buy-in range']}, max ${row['Max buy-in price']}, guide resale ${row['Most accurate resale price']}.`; updateGuideTrust(row);
  renderChecklist(); updateAll(); renderDashboard();
}
function updateAll(){
  const row=currentRow(); const valuation=guideValuation(row);
  const item=Number($('itemPrice').value)||0; const buying=Number($('buyingCosts').value)||0; const total=item+buying;
  if(document.activeElement!==$('totalPaid')) $('totalPaid').value=total||'';
  const paid=Number($('totalPaid').value)||total;
  const sell=Number($('sellPrice').value)||0; const selling=Number($('sellingCosts').value)||0; const platform=platformValues();
  const fee=sell*platform.feePct+platform.fixedFee; const profit=sell-paid-selling-fee; const margin=sell>0?profit/sell*100:0; const roi=paid>0?profit/paid*100:0;
  const safeOffer=sell>0?Math.max(0,sell*.70-selling-fee):row.maxBuy; const walkAway=roundDown(Math.min(row.maxBuy,safeOffer || row.maxBuy)); const opening=roundDown(Math.max(0,walkAway-Math.max(3,valuation.realistic*.05))); const listAt=roundDown(Math.max(valuation.realistic,valuation.realistic*1.08));
  const scoreData=calculateDealScore(row,total,valuation); currentScore=scoreData.score; const verdict=verdictFromScore(scoreData.score,scoreData.locked,total); currentVerdict=verdict.label;
  last={row,valuation,item,buying,total,paid,sell,selling,fee,profit,margin,roi,opening,walkAway,listAt,score:scoreData.score,verdict:verdict.label};

  $('buyVerdict').textContent=verdict.label; $('buyVerdict').className=verdict.klass; $('dealScoreOut').textContent=total>0?scoreData.score:'--'; $('scoreRing').style.setProperty('--score',`${total>0?scoreData.score*3.6:0}deg`);
  $('totalCostOut').textContent=money(total); $('buyRangeOut').textContent=row['Recommended buy-in range']; $('maxBuyOut').textContent=row['Max buy-in price']; $('guideResaleOut').textContent=row['Most accurate resale price'];
  let buyReason='Enter the item price and shipping/buyer protection to compare the full cost against the guide.';
  if(total>0){const p=projectedNumbers(row,total,valuation); if(scoreData.locked){buyReason=`The maths may work, but required checks are not complete. Projected profit is ${money(p.profit)} with ${numFormatter.format(p.roi)}% ROI. Tick the required checks before treating this as a proper buy.`} else if(scoreData.score>=85){buyReason=`Strong deal. Full cost is ${money(total)} against a max buy-in of ${row['Max buy-in price']}, with projected profit around ${money(p.profit)}.`} else if(scoreData.score>=70){buyReason=`Good deal if condition matches the grade. Projected profit is ${money(p.profit)} with ${numFormatter.format(p.roi)}% ROI.`} else if(scoreData.score>=55){buyReason=`Not terrible, but negotiate. Try to get closer to ${row['Recommended buy-in range']} before buying.`} else {buyReason=`The risk, price or profit does not justify the buy. You are better waiting for a cheaper one.`}}
  $('buyReason').textContent=buyReason;
  $('riskNote').textContent=`${row.Product}: ${row.tip} Avoid: ${row.avoid}`;
  $('buyMeter').style.width=`${row.maxBuy>0?Math.min(100,total/row.maxBuy*100):0}%`; $('buyMeterWrap').className='meter '+(total<=row.targetBuyHigh?'good':total<=row.maxBuy?'warn':'bad');

  let saleLabel='Enter sell price', saleClass='decision maybe', saleReason='Enter your planned selling price to see the profit.';
  if(sell>0&&paid>0){const rangeNote=sell<valuation.resaleLow?' below the resale range':sell>valuation.resaleHigh?' above the resale range':' inside the resale range'; if(profit<=0){saleLabel='Bad sale';saleClass='decision bad';saleReason=`This loses ${money(Math.abs(profit))} after costs.`} else if(roi>=30&&sell>=valuation.resaleLow&&sell<=valuation.resaleHigh){saleLabel='Good profit';saleClass='decision good';saleReason=`Profit is ${money(profit)} with ${numFormatter.format(roi)}% ROI, and the price is${rangeNote}.`} else if(roi>=20){saleLabel='Decent profit';saleClass='decision good';saleReason=`Profit is ${money(profit)} with ${numFormatter.format(roi)}% ROI, but the price is${rangeNote}.`} else {saleLabel='Small profit';saleClass='decision maybe';saleReason=`Profit is positive, but ROI is only ${numFormatter.format(roi)}%. Make sure it is worth your time.`}}
  $('saleVerdict').textContent=saleLabel; $('saleVerdict').className=saleClass; $('profitOut').textContent=money(profit); $('marginOut').textContent=`${numFormatter.format(margin)}%`; $('roiOut').textContent=`${numFormatter.format(roi)}%`; $('resaleRangeOut').textContent=row['Realistic resale price range']; $('saleReason').textContent=saleReason;
  $('openingOfferOut').textContent=`Opening offer: ${money(opening)}`; $('walkAwayOut').textContent=`Walk-away: ${money(walkAway)}`; $('listAtOut').textContent=`List at: ${money(listAt)}`;
  updateGuideTrust(row); updateProof(row); updateNegotiation(row,valuation,opening,walkAway,listAt); renderListing(row,valuation); renderSavedStats(); if(tableOpen) renderTable();
}
function renderChecklist(){
  const row=currentRow(); const key=productKey(row.Product); const meta=metaFor(key); const checks=productChecklists[key] || ['Confirm exact model','Test every main function','Check locks, battery and accessories','Reduce buy-in if anything is unclear']; const req=requiredIndexes(row);
  $('checkTitle').textContent=`Check before paying: ${key}`; $('checkIntro').textContent=`${meta.tip} Main risk: ${meta.avoid}`;
  $('checklistBox').innerHTML=checks.map((c,i)=>`<label class="check ${req.includes(i)?'required':''}"><input type="checkbox"><span>${esc(c)}${req.includes(i)?'<span class="required-pill">required</span>':''}</span></label>`).join(''); updateCheckProgress();
}
function updateCheckProgress(){const row=currentRow(); const stats=checkStats(row); $('checkProgress').textContent=`${stats.done} of ${stats.total} checks completed`; updateAllSafeProof(row)}
function updateAllSafeProof(row){if($('requiredDoneOut')) updateProof(row)}
function updateProof(row){const stats=checkStats(row); const cap=scoreCapFor(row); $('requiredDoneOut').textContent=`${stats.reqDone}/${stats.reqTotal}`; $('scoreCapOut').textContent=stats.locked?`${cap}/100`:'None'; if(stats.locked){$('proofLockOut').className='explain danger-note'; $('proofLockOut').textContent=`Required checks are missing. This stops the item being treated as a strong buy, even if the profit looks good.`} else {$('proofLockOut').className='explain success'; $('proofLockOut').textContent='Required checks are complete. The score can now reflect the maths properly.'}}
function updateNegotiation(row,valuation,opening,walkAway,listAt){$('negOpeningOut').textContent=money(opening); $('negFairOut').textContent=row['Recommended buy-in range']; $('negWalkAwayOut').textContent=money(walkAway); $('negListOut').textContent=money(listAt); $('negoMessage').value=`Hi, would you take ${money(opening)} if I can pay today? I just need to check it is fully working first. My max would be around ${money(walkAway)} depending on condition.`}
function renderListing(row,valuation){const key=productKey(row.Product); const meta=metaFor(key); const grade=row.Grade.replace('Grade ',''); const condition=grade==='A'?'very good used condition':grade==='B'?'good used condition':'used condition with visible wear'; const title=`${key} - tested working - ${condition}`; const checks=(productChecklists[key]||[]).slice(0,4).join(', ').toLowerCase(); const desc=`${key} in ${condition}. Tested and working. Checked: ${checks || 'main functions'}. Please see photos for condition. Any marks or wear are shown clearly. Collection or postage available depending on platform.`; $('listingTitle').value=title; $('listingDescription').value=desc; const photos=['Front clear photo','Back clear photo','Close-up of wear/marks','Model/serial label where safe','Accessories included','Proof it powers on or test screen']; if(meta.category==='Phone') photos.push('Battery health screen','No iCloud/lock proof'); if(meta.category==='Earbuds') photos.push('Case and both buds','Model numbers'); const box=$('photoChecklistOut'); const photoKey=`${key}|${row.Grade}`; if(box.dataset.photoKey!==photoKey){box.dataset.photoKey=photoKey; box.innerHTML=`<p class="small">Photo checklist</p>`+photos.map((photo,i)=>`<label class="photo-check"><input type="checkbox"><span>${esc(photo)}</span></label>`).join('')}}
function renderDashboard(){renderBankroll(); renderQuickRank()}
function rankTemplate(r,i){const gross=r.realistic-r.maxBuy-defaultSellingCost(r); return `<div class="rank-item"><div class="rank-no">${i+1}</div><div><strong>${esc(r.icon)} ${esc(r.Product)} ${esc(r.Grade)}</strong><div class="rank-meta">${riskBadge(r.risk)} ${badge(r.Confidence)} <span class="chip">${esc(r.speed)}</span><span class="chip">Max ${money(r.maxBuy)}</span></div><p class="tiny" style="margin:6px 0 0">${esc(r.tip)}</p></div><div class="mini-money">~${money(gross)} gross</div></div>`}
function setHuntOpen(open){huntOpen=open; $('huntListBody').classList.toggle('open',open); $('openHuntList').textContent=open?'Close hunt list':'Open hunt list'; $('huntListStatus').textContent=open?'Showing the best targets that fit your current bankroll.':'Hunt list closed.'; renderBankroll()}
function setQuickRankOpen(open){quickRankOpen=open; $('quickRankBody').classList.toggle('open',open); $('openQuickRank').textContent=open?'Close best items':'Open best items'; $('quickRankStatus').textContent=open?'Showing the strongest items across the whole guide.':'Best items closed.'; renderQuickRank()}
function renderBankroll(){const budget=Number($('bankroll').value)||0; const fit=enrichedRows.filter(r=>r.maxBuy<=budget).sort((a,b)=>quickScore(b)-quickScore(a)).slice(0,8); $('bankrollSummary').textContent=budget>0?`${fit.length} guide rows fit inside ${money(budget)}.`:'Enter a budget to rank targets.'; if(!huntOpen)return; $('bankrollList').innerHTML=fit.length?fit.map(rankTemplate).join(''):`<div class="empty">Nothing in the guide fits ${money(budget)}. Look for lower grade controllers or save a bit more.</div>`}
function renderQuickRank(){if(!quickRankOpen)return; const ranked=[...enrichedRows].sort((a,b)=>quickScore(b)-quickScore(a)).slice(0,8); $('quickRankList').innerHTML=ranked.map(rankTemplate).join('')}
function setPlatformPreset(){const preset=platformPresets[$('platform').value]||platformPresets.Custom; if($('platform').value!=='Custom'){$('platformFee').value=preset.feePct;$('fixedFee').value=preset.fixedFee} updateAll()}
function tableRows(){const q=$('tableSearch').value.toLowerCase().trim(); const grade=$('tableGrade').value; const risk=$('tableRisk').value; return enrichedRows.filter(r=>(!q||Object.values(r).join(' ').toLowerCase().includes(q))&&(!grade||r.Grade===grade)&&(!risk||r.risk===risk))}
function renderTable(){if(!tableOpen)return; const data=tableRows(); $('tableStatus').textContent=`${data.length} of ${rows.length} rows shown`; $('tableBody').innerHTML=data.length?data.map(r=>`<tr><td><strong>${esc(r.icon)} ${esc(r.Product)}</strong><br><span class="small">${esc(r.category)} · checked ${esc(checkedText(r.Product))}</span></td><td>${esc(r.Grade)}</td><td class="money">${esc(r['Realistic resale price range'])}</td><td class="money">${esc(r['Recommended buy-in range'])}</td><td class="money">${esc(r['Max buy-in price'])}</td><td>${badge(r.Confidence)}</td><td>${riskBadge(r.risk)}</td><td>${esc(r['Key checks before buying'])}</td></tr>`).join(''):`<tr><td colspan="8" class="small">No rows match.</td></tr>`}
function loadDeals(){try{deals=JSON.parse(localStorage.getItem(DEAL_KEY)||'[]')}catch(e){deals=[]}}
function saveDeals(){localStorage.setItem(DEAL_KEY,JSON.stringify(deals))}
function renderSavedStats(){const body=$('dealsBody'); const count=deals.length; const spent=deals.reduce((a,d)=>a+(Number(d.cost)||0),0); const projected=deals.reduce((a,d)=>a+(Number(d.projectedProfit ?? d.profit)||0),0); const actualDeals=deals.filter(d=>d.actualProfit!==null&&d.actualProfit!==''&&d.actualProfit!==undefined&&Number.isFinite(Number(d.actualProfit))); const actual=actualDeals.reduce((a,d)=>a+Number(d.actualProfit),0); const accuracyDeals=actualDeals.filter(d=>Number.isFinite(Number(d.projectedProfit ?? d.profit))); const accuracy=accuracyDeals.length?accuracyDeals.reduce((a,d)=>a+(Number(d.actualProfit)-Number(d.projectedProfit ?? d.profit)),0):0; const daysDeals=deals.filter(d=>Number.isFinite(Number(d.daysToSell))&&Number(d.daysToSell)>0); const avgDays=daysDeals.length?daysDeals.reduce((a,d)=>a+Number(d.daysToSell),0)/daysDeals.length:0; $('savedCountOut').textContent=count; $('savedSpentOut').textContent=money(spent); $('savedProfitOut').textContent=money(projected); if($('savedActualProfitOut')) $('savedActualProfitOut').textContent=actualDeals.length?money(actual):'£0'; if($('savedAccuracyOut')) $('savedAccuracyOut').textContent=accuracyDeals.length?`${accuracy>=0?'+':''}${money(accuracy)}`:'No actuals yet'; if($('savedAvgDaysOut')) $('savedAvgDaysOut').textContent=daysDeals.length?`${numFormatter.format(avgDays)} days`:'No sales yet'; body.innerHTML=count?deals.map((d,i)=>{const projectedProfit=Number(d.projectedProfit ?? d.profit)||0; const actualProfit=d.actualProfit!==null&&d.actualProfit!==''&&d.actualProfit!==undefined&&Number.isFinite(Number(d.actualProfit))?Number(d.actualProfit):null; const actualSale=d.actualSale!==null&&d.actualSale!==''&&d.actualSale!==undefined&&Number.isFinite(Number(d.actualSale))?Number(d.actualSale):null; const days=Number.isFinite(Number(d.daysToSell))&&Number(d.daysToSell)>0?`${esc(d.daysToSell)} days`:'—'; return `<tr class="saved-row"><td>${esc(d.date)}</td><td><strong>${esc(d.product)}</strong><br><span class="small">${esc(d.grade)}</span></td><td>${esc(d.status)}</td><td class="money">${money(d.cost)}</td><td class="money">${money(d.sell)}</td><td class="money">${money(projectedProfit)}</td><td class="money">${actualSale===null?'—':money(actualSale)}</td><td class="money">${actualProfit===null?'—':money(actualProfit)}</td><td>${days}</td><td>${esc(d.score)}</td><td>${esc(d.source||'')}<br><span class="small">${esc(d.actualPlatform?`Sold on ${d.actualPlatform}. `:'')}${esc(d.notes||'')}</span></td><td><button class="tool-btn danger" type="button" data-del="${i}">Delete</button></td></tr>`}).join(''):`<tr><td colspan="12" class="empty">No saved flips yet. Check a deal, then press “Save current deal”.</td></tr>`}
function saveCurrentDeal(){if(!last)return; const actualSaleRaw=$('actualSalePrice')?$('actualSalePrice').value:''; const actualCostRaw=$('actualSellingCosts')?$('actualSellingCosts').value:''; const actualSale=actualSaleRaw===''?null:Number(actualSaleRaw); const actualSellingCosts=actualCostRaw===''?0:Number(actualCostRaw); const actualProfit=actualSale===null?null:actualSale-(last.paid||last.total)-actualSellingCosts; const d={date:$('dealDate').value||new Date().toISOString().slice(0,10), product:last.row.Product, grade:last.row.Grade, status:$('dealStatus').value, source:$('dealSource').value.trim(), notes:$('dealNotes').value.trim(), cost:last.paid||last.total, sell:last.sell, projectedProfit:last.profit, profit:last.profit, roi:last.roi, actualSale, actualSellingCosts, actualProfit, actualPlatform:$('actualPlatform')?$('actualPlatform').value.trim():'', daysToSell:$('daysToSell')?$('daysToSell').value:'', score:last.score, verdict:last.verdict}; deals.unshift(d); saveDeals(); renderSavedStats()}
function exportCSV(){const headers=['date','product','grade','status','source','cost','sell','projectedProfit','roi','actualSale','actualSellingCosts','actualProfit','actualPlatform','daysToSell','score','verdict','notes']; const lines=[headers.join(',')].concat(deals.map(d=>headers.map(h=>`"${String(d[h]??'').replace(/"/g,'""')}"`).join(','))); const blob=new Blob([lines.join('\n')],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='threadfound-flips.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)}
function copyFrom(id){const el=$(id); const text=el.value||el.textContent; if(navigator.clipboard){navigator.clipboard.writeText(text)} else {el.select(); document.execCommand('copy')}}
function bind(){
  ['product','gradeSelect'].forEach(id=>$(id).addEventListener('change',()=>{$('itemPrice').value='';$('buyingCosts').value='0';loadGuide()}));
  ['itemPrice','buyingCosts','totalPaid','sellPrice','platformFee','sellingCosts','fixedFee'].forEach(id=>$(id).addEventListener('input',updateAll));
  $('platform').addEventListener('change',setPlatformPreset); $('loadGuide').addEventListener('click',loadGuide); $('resetBuying').addEventListener('click',()=>{$('itemPrice').value='';$('buyingCosts').value='0';updateAll()}); $('useBuyTotal').addEventListener('click',()=>{$('totalPaid').value=(Number($('itemPrice').value)||0)+(Number($('buyingCosts').value)||0)||'';updateAll()}); $('useGuideSell').addEventListener('click',()=>{$('sellPrice').value=currentRow().realistic;updateAll()});
  $('resetChecks').addEventListener('click',()=>{document.querySelectorAll('#checklistBox input').forEach(b=>b.checked=false);updateCheckProgress();updateAll()}); $('checklistBox').addEventListener('input',()=>{updateCheckProgress();updateAll()});
  $('copyNego').addEventListener('click',()=>copyFrom('negoMessage')); $('copyTitle').addEventListener('click',()=>copyFrom('listingTitle')); $('copyDesc').addEventListener('click',()=>copyFrom('listingDescription'));
  $('refreshBankroll').addEventListener('click',renderDashboard); $('bankroll').addEventListener('input',renderDashboard);
  $('openHuntList').addEventListener('click',()=>setHuntOpen(!huntOpen)); $('openQuickRank').addEventListener('click',()=>setQuickRankOpen(!quickRankOpen));
  $('saveDeal').addEventListener('click',saveCurrentDeal); if($('stickySaveDeal')) $('stickySaveDeal').addEventListener('click',saveCurrentDeal); $('exportDeals').addEventListener('click',exportCSV); $('clearDeals').addEventListener('click',()=>{if(confirm('Clear all saved flips from this browser?')){deals=[];saveDeals();renderSavedStats()}}); $('dealsBody').addEventListener('click',e=>{const btn=e.target.closest('[data-del]'); if(btn){deals.splice(Number(btn.dataset.del),1);saveDeals();renderSavedStats()}});
  $('openTable').addEventListener('click',()=>{tableOpen=true;$('tableTools').classList.add('open');$('openTable').textContent='Refresh price table';renderTable()}); $('closeTable').addEventListener('click',()=>{tableOpen=false;$('tableTools').classList.remove('open');$('openTable').textContent='Open price table';$('tableStatus').textContent='Table closed.'}); ['tableSearch','tableGrade','tableRisk'].forEach(id=>$(id).addEventListener('input',renderTable));
}
init();
