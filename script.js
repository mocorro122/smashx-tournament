const $=id=>document.getElementById(id);
let midPool=[],lowPool=[],randomPool=[],teams=[],bracketA=[],bracketB=[],started=false,spinning=false,rotation=0,currentGroups=[],matchRecords=[];
const colors=["#704bff","#0ea5a4","#f59e0b","#e84d9a","#3b82f6","#84cc16","#f97316","#8b5cf6","#06b6d4","#ef4444"];
function parse(v){return [...new Set(v.split("\n").map(x=>x.trim()).filter(Boolean))]}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function status(msg,type=""){$("status").className="status "+type;$("status").textContent=msg}
function tstatus(msg,type=""){$("tournamentStatus").className="status "+type;$("tournamentStatus").textContent=msg}
function updateCounts(){
  const method = $("pairingMethod").value;
  if(method === "category"){
    let m=parse($("midInput").value),l=parse($("lowInput").value);
    $("midCount").textContent=m.length+" players";
    $("lowCount").textContent=l.length+" players";
    if(!started)drawWheel([...m,...l].slice(0,12));
  }else{
    let all=parse($("allPlayersInput").value);
    $("allPlayersCount").textContent=all.length+" players";
    if(!started)drawWheel(all.slice(0,12));
  }
}
function drawWheel(names=[]){if(!names.length)names=["MID","LOW","MID","LOW","MID","LOW"];let c=$("wheel"),x=c.getContext("2d"),s=c.width,r=s/2-15,sl=Math.PI*2/names.length;x.clearRect(0,0,s,s);names.forEach((n,i)=>{let st=i*sl-Math.PI/2;x.beginPath();x.moveTo(s/2,s/2);x.arc(s/2,s/2,r,st,st+sl);x.closePath();x.fillStyle=colors[i%colors.length];x.fill();x.strokeStyle="rgba(255,255,255,.25)";x.lineWidth=3;x.stroke();x.save();x.translate(s/2,s/2);x.rotate(st+sl/2);x.textAlign="right";x.fillStyle="#fff";x.font=`800 ${names.length>10?22:28}px sans-serif`;let t=n.length>15?n.slice(0,14)+"…":n;x.fillText(t,r-28,8);x.restore()});x.beginPath();x.arc(s/2,s/2,r,0,Math.PI*2);x.strokeStyle="rgba(255,255,255,.4)";x.lineWidth=9;x.stroke()}
function renderPairs(){const render=(el,arr)=>{$(el).innerHTML=arr.length?arr.map((p,i)=>`<div class="pair"><div class="num">${i+1}</div><div><b>${esc(p.mid)}</b> × <b class="low">${esc(p.low)}</b></div></div>`).join(""):"No pairs yet."};render("bracketA",bracketA);render("bracketB",bracketB);$("countA").textContent=bracketA.length+" pairs";$("countB").textContent=bracketB.length+" pairs"}
function init(){
  const method = $("pairingMethod").value;

  if(method === "category"){
    let m=parse($("midInput").value),l=parse($("lowInput").value);
    if(!m.length||!l.length){
      status("Please add both Mid and Low players.","err");
      return false;
    }
    if(m.length!==l.length){
      status(`Counts do not match: ${m.length} Mid and ${l.length} Low.`,"err");
      return false;
    }
    midPool=[...m];
    lowPool=[...l];
    randomPool=[];
    $("midInput").disabled=true;
    $("lowInput").disabled=true;
  }else{
    let all=parse($("allPlayersInput").value);
    if(all.length < 2){
      status("Please add at least two players.","err");
      return false;
    }
    if(all.length % 2 !== 0){
      status(`Random Pairing requires an even number of players. You currently have ${all.length}.`,"err");
      return false;
    }
    randomPool=[...all];
    midPool=[];
    lowPool=[];
    $("allPlayersInput").disabled=true;
  }

  teams=[];
  bracketA=[];
  bracketB=[];
  started=true;
  $("pairingMethod").disabled=true;
  renderPairs();
  return true;
}
function animate(names,selected){return new Promise(res=>{drawWheel(names);let idx=names.indexOf(selected),slice=360/names.length,target=rotation+5*360+(360-(idx*slice+slice/2));rotation=target;$("wheel").style.transform=`rotate(${rotation}deg)`;setTimeout(res,3050)})}
async function spinPair(){
  if(spinning)return;
  if(!started&&!init())return;

  const method = $("pairingMethod").value;
  const remaining = method==="category" ? midPool.length : randomPool.length/2;

  if(remaining<=0){
    status("All pairings are complete.","ok");
    return;
  }

  spinning=true;
  toggle(true);
  let team;

  if(method==="category"){
    let mid=midPool[Math.floor(Math.random()*midPool.length)];
    $("hub").innerHTML="SPINNING<br>MID";
    await animate([...midPool],mid);
    midPool.splice(midPool.indexOf(mid),1);

    let low=lowPool[Math.floor(Math.random()*lowPool.length)];
    $("hub").innerHTML="SPINNING<br>LOW";
    await animate([...lowPool],low);
    lowPool.splice(lowPool.indexOf(low),1);

    team={name:`${mid} × ${low}`,mid,low};
  }else{
    let first=randomPool[Math.floor(Math.random()*randomPool.length)];
    $("hub").innerHTML="SPINNING<br>PLAYER 1";
    await animate([...randomPool],first);
    randomPool.splice(randomPool.indexOf(first),1);

    let second=randomPool[Math.floor(Math.random()*randomPool.length)];
    $("hub").innerHTML="SPINNING<br>PLAYER 2";
    await animate([...randomPool],second);
    randomPool.splice(randomPool.indexOf(second),1);

    team={name:`${first} × ${second}`,mid:first,low:second};
  }

  teams.push(team);
  let target=bracketA.length<=bracketB.length?bracketA:bracketB;
  target.push(team);
  $("latest").textContent=team.name;
  renderPairs();

  const pairsLeft = method==="category" ? midPool.length : randomPool.length/2;

  if(pairsLeft===0){
    status("Pairing complete. Tournament Setup is now available.","ok");
    $("setupSection").classList.remove("hidden");
    $("hub").innerHTML="PAIRING<br>DONE";
    drawWheel(["DONE","A","B","DONE","A","B"]);
    $("setupSection").scrollIntoView({behavior:"smooth"});
  }else{
    status(`${pairsLeft} pair(s) remaining.`,"ok");
    const wheelNames = method==="category"
      ? [...midPool,...lowPool].slice(0,12)
      : randomPool.slice(0,12);
    drawWheel(wheelNames);
  }

  spinning=false;
  toggle(false);
}
async function spinAll(){
  if(spinning)return;
  if(!started&&!init())return;
  const method=$("pairingMethod").value;
  while((method==="category" && midPool.length) || (method==="random" && randomPool.length)){
    await spinPair();
  }
}
function toggle(v){["spinOne","spinAll","reset","shuffleMid","shuffleLow","shuffleBoth","shuffleAllPlayers"].forEach(id=>$(id).disabled=v)}
$("shuffleMid").onclick=()=>{if(started)return;let a=shuffle(parse($("midInput").value));$("midInput").value=a.join("\n");updateCounts();status("Mid players shuffled.","ok")}
$("shuffleLow").onclick=()=>{if(started)return;let a=shuffle(parse($("lowInput").value));$("lowInput").value=a.join("\n");updateCounts();status("Low players shuffled.","ok")}
$("shuffleBoth").onclick=()=>{$("shuffleMid").click();$("shuffleLow").click();status("Mid and Low players shuffled.","ok")}
$("shuffleAllPlayers").onclick=()=>{
  if(started)return;
  let a=shuffle(parse($("allPlayersInput").value));
  $("allPlayersInput").value=a.join("\n");
  updateCounts();
  status("Players shuffled.","ok");
};

$("pairingMethod").onchange=()=>{
  if(started)return;
  const randomMode=$("pairingMethod").value==="random";
  $("categoryInputs").classList.toggle("hidden",randomMode);
  $("randomInputs").classList.toggle("hidden",!randomMode);
  $("categoryShuffleControls").classList.toggle("hidden",randomMode);
  $("randomShuffleControls").classList.toggle("hidden",!randomMode);
  $("pairingHelp").textContent=randomMode
    ?"Enter all players in one list. The system will randomly create teams of two."
    :"Enter Mid and Low players separately. Each team will contain exactly one Mid and one Low player.";
  status(randomMode
    ?"Add an even number of players to generate random teams."
    :"Add the same number of Mid and Low players to begin.");
  updateCounts();
};

$("spinOne").onclick=spinPair;
$("spinAll").onclick=spinAll;
$("reset").onclick=()=>$("resetModal").classList.remove("hidden");
$("midInput").oninput=$("lowInput").oninput=$("allPlayersInput").oninput=updateCounts;

function showToast(message){
  $("toast").textContent=message;
  $("toast").classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>$("toast").classList.remove("show"),2200);
}

function resetPairingSession(){
  const method=$("pairingMethod").value;

  midPool=[];
  lowPool=[];
  randomPool=[];
  teams=[];
  bracketA=[];
  bracketB=[];
  started=false;
  spinning=false;
  rotation=0;

  $("midInput").value="";
  $("lowInput").value="";
  $("allPlayersInput").value="";

  $("midInput").disabled=false;
  $("lowInput").disabled=false;
  $("allPlayersInput").disabled=false;
  $("pairingMethod").disabled=false;

  $("midCount").textContent="0 players";
  $("lowCount").textContent="0 players";
  $("allPlayersCount").textContent="0 players";

  $("latest").textContent="No pair selected";
  $("hub").innerHTML="READY<br>TO SPIN";
  $("wheel").style.transform="rotate(0deg)";
  drawWheel();

  renderPairs();
  $("setupSection").classList.add("hidden");
  $("tourOutput").classList.add("hidden");
  $("generatedContent").innerHTML="";
  currentGroups=[];
  matchRecords=[];

  toggle(false);

  if(method==="random"){
    status("Add an even number of players to generate random teams.");
  }else{
    status("Add the same number of Mid and Low players to begin.");
  }

  $("resetModal").classList.add("hidden");
  showToast("Player data has been reset.");
}

$("cancelReset").onclick=()=>$("resetModal").classList.add("hidden");
$("confirmReset").onclick=resetPairingSession;
$("resetModal").onclick=e=>{
  if(e.target===$("resetModal")) $("resetModal").classList.add("hidden");
};

function updateFormatPanels(){
  const hasGroups = $("format").value === "roundrobin";
  document.querySelectorAll(".rr-only").forEach(el=>el.classList.toggle("hidden", !hasGroups));
}
$("format").onchange = updateFormatPanels;

$("advancePreset").onchange = () => {
  const isCustom = $("advancePreset").value === "custom";
  $("customAdvanceWrap").classList.toggle("hidden", !isCustom);
  if (!isCustom) $("advanceCount").value = $("advancePreset").value;
};

$("playoff").onchange = () => {
  $("customPlayoffWrap").classList.toggle("hidden", $("playoff").value !== "custom");
};

updateFormatPanels();

function distributeTeams(list,count){let groups=Array.from({length:count},()=>[]);list.forEach((t,i)=>groups[i%count].push(t));return groups}
function roundRobinMatches(group,gi){let arr=[...group];if(arr.length%2)arr.push(null);let rounds=[];for(let r=0;r<arr.length-1;r++){let games=[];for(let i=0;i<arr.length/2;i++){let a=arr[i],b=arr[arr.length-1-i];if(a&&b)games.push({id:`g${gi}r${r}m${i}`,group:gi,round:r,home:a,away:b})}rounds.push(games);arr=[arr[0],arr[arr.length-1],...arr.slice(1,-1)]}return rounds}
function standingsFor(group,gi){let rows=group.map(t=>({team:t,p:0,w:0,l:0,pf:0,pa:0,pd:0}));matchRecords.filter(m=>m.group===gi).forEach(m=>{let hs=Number($(m.id+"h")?.value),as=Number($(m.id+"a")?.value);if(Number.isNaN(hs)||Number.isNaN(as)||$(""+m.id+"h")?.value===""||$(""+m.id+"a")?.value==="")return;let h=rows.find(r=>r.team.name===m.home.name),a=rows.find(r=>r.team.name===m.away.name);h.p++;a.p++;h.pf+=hs;h.pa+=as;a.pf+=as;a.pa+=hs;if(hs>as){h.w++;a.l++}else if(as>hs){a.w++;h.l++}});rows.forEach(r=>r.pd=r.pf-r.pa);rows.sort((a,b)=>b.w-a.w||b.pd-a.pd||b.pf-a.pf);return rows}
function updateStandings(){currentGroups.forEach((g,gi)=>{let rows=standingsFor(g,gi);let body=$(`stand${gi}`);if(body)body.innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.team.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf}</td><td>${r.pa}</td><td>${r.pd}</td></tr>`).join("")})}
function renderRoundRobin(list){
  let groupCount=Math.max(1,Number($("groupCount").value)||1);
  if(groupCount>list.length)groupCount=list.length;
  currentGroups=distributeTeams(list,groupCount);matchRecords=[];
  let html=`<div class="groups">`;
  currentGroups.forEach((g,gi)=>{html+=`<div class="card"><div class="pad"><h3>Bracket ${String.fromCharCode(65+gi)}</h3>${g.map((t,i)=>`<div class="teamline">${i+1}. ${esc(t.name)}</div>`).join("")}</div></div>`});html+=`</div>`;
  currentGroups.forEach((g,gi)=>{let rounds=roundRobinMatches(g,gi);html+=`<div class="card" style="margin-top:16px"><div class="pad"><h3>Bracket ${String.fromCharCode(65+gi)} Match Schedule</h3><p class="muted">First to ${$("scoreTo").value}</p><div class="rounds">`;rounds.forEach((games,ri)=>{html+=`<div class="round"><b>Round ${ri+1}</b>`;games.forEach(m=>{matchRecords.push(m);html+=`<div class="matchline score-grid"><span>${esc(m.home.name)}</span><input type="number" id="${m.id}h" min="0"><span>–</span><input type="number" id="${m.id}a" min="0"><span>${esc(m.away.name)}</span></div>`});html+=`</div>`});html+=`</div><h3 style="margin-top:18px">Standings</h3><table><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>PD</th></tr></thead><tbody id="stand${gi}"></tbody></table></div></div>`});
  $("generatedContent").innerHTML=html;matchRecords.forEach(m=>[$(m.id+"h"),$(m.id+"a")].forEach(i=>i.addEventListener("input",updateStandings)));updateStandings()
}
function nextPow2(n){let p=1;while(p<n)p*=2;return p}
function renderElimination(list,doubleMode=false){let size=nextPow2(list.length),seed=[...list];while(seed.length<size)seed.push(null);let games=[];for(let i=0;i<size/2;i++)games.push([seed[i],seed[size-1-i]]);let html=`<div class="card"><div class="pad"><h2>${doubleMode?"Double":"Single"} Elimination</h2><p class="muted">First to ${$("scoreTo").value}. ${doubleMode?"Includes a simplified winners and losers bracket layout.":"Opening round shown below."}</p><div class="round"><h3>Opening Round</h3>`;games.forEach((g,i)=>{html+=`<div class="matchline"><b>Match ${i+1}:</b> ${g[0]?esc(g[0].name):"BYE"} vs ${g[1]?esc(g[1].name):"BYE"}</div>`});html+=`</div>`;if(doubleMode)html+=`<div class="round" style="margin-top:12px"><h3>Losers Bracket</h3><div class="matchline">Losers from the opening round move here.</div></div>`;html+=`<div class="round" style="margin-top:12px"><h3>Final Stage</h3><div class="matchline">${$("thirdPlace").checked?"3rd Place Match included. ":""}Championship match follows the selected playoff format.</div></div></div></div>`;$("generatedContent").innerHTML=html}
$("generateTournament").onclick=()=>{if(!teams.length){tstatus("Complete the pairing first.","err");return}let list=$("shuffleTeams").checked?shuffle(teams):[...teams],format=$("format").value;if(format==="roundrobin"){let groups=Number($("groupCount").value),tpg=Number($("teamsPerGroup").value);if(groups*tpg<list.length){tstatus("Groups × teams per bracket is smaller than the number of teams. Increase the settings.","err");return}renderRoundRobin(list)}else renderElimination(list,format==="double");$("tourOutput").classList.remove("hidden");tstatus("Tournament generated successfully.","ok");$("tourOutput").scrollIntoView({behavior:"smooth"})}
function getAdvanceCount(){
  return $("advancePreset").value === "custom"
    ? Math.max(1, Number($("advanceCount").value) || 1)
    : Number($("advancePreset").value);
}

function getPlayoffTeamLimit(){
  const type = $("playoff").value;
  if(type === "finals") return 2;
  if(type === "semis") return 4;
  if(type === "quarters") return 8;
  if(type === "r16") return 16;
  return Math.max(2, Number($("customPlayoffTeams").value) || 2);
}

function crossoverSeed(qualifiedByGroup){
  const groupCount = qualifiedByGroup.length;
  const maxRank = Math.max(...qualifiedByGroup.map(g => g.length), 0);
  const matches = [];
  const used = new Set();

  // For two groups, use classic crossover seeding:
  // A1 vs B(last qualifier), B1 vs A(last qualifier), then move inward.
  if(groupCount === 2){
    const a = qualifiedByGroup[0];
    const b = qualifiedByGroup[1];
    const rounds = Math.min(a.length, b.length);

    for(let i = 0; i < rounds; i++){
      const left = a[i];
      const right = b[rounds - 1 - i];
      if(left && right && !used.has(left.name) && !used.has(right.name)){
        matches.push([left, right]);
        used.add(left.name);
        used.add(right.name);
      }

      const left2 = b[i];
      const right2 = a[rounds - 1 - i];
      if(left2 && right2 && !used.has(left2.name) && !used.has(right2.name)){
        matches.push([left2, right2]);
        used.add(left2.name);
        used.add(right2.name);
      }
    }
    return matches;
  }

  // For 3+ groups, pair high seeds against lower seeds from the next group.
  const flat = [];
  qualifiedByGroup.forEach((group, gi) => {
    group.forEach((team, ri) => flat.push({...team, gi, ri}));
  });

  flat.sort((a,b) => a.seed - b.seed || a.gi - b.gi);
  while(flat.length >= 2){
    const first = flat.shift();
    let opponentIndex = flat.findIndex(t => t.gi !== first.gi);
    if(opponentIndex < 0) opponentIndex = flat.length - 1;
    const opponent = flat.splice(opponentIndex,1)[0];
    matches.push([first, opponent]);
  }

  return matches;
}

$("rebuildPlayoffs").onclick=()=>{
  if($("format").value!=="roundrobin"||!currentGroups.length){
    tstatus("Generate a round-robin tournament first.","warn");
    return;
  }

  const adv = getAdvanceCount();
  const teamLimit = getPlayoffTeamLimit();
  const qualifiedByGroup = currentGroups.map((g,gi)=>
    standingsFor(g,gi).slice(0,adv).map((r,pos)=>({
      name:r.team.name,
      group:String.fromCharCode(65+gi),
      seed:pos+1
    }))
  );

  let allQualified = qualifiedByGroup.flat();
  if(allQualified.length < 2){
    tstatus("Not enough qualified teams to generate playoffs.","err");
    return;
  }

  allQualified = allQualified.slice(0, teamLimit);

  // Rebuild group lists after applying playoff team limit.
  const limitedGroups = currentGroups.map((g,gi)=>{
    const letter = String.fromCharCode(65+gi);
    return allQualified.filter(t=>t.group===letter);
  });

  const matches = crossoverSeed(limitedGroups);
  const stage = $("playoff").value;
  const stageName = stage==="r16" ? "Round of 16"
    : stage==="quarters" ? "Quarterfinals"
    : stage==="semis" ? "Semifinals"
    : stage==="finals" ? "Finals Only"
    : "Custom Playoff";

  let html=`<div class="card" style="margin-top:16px"><div class="pad">
    <h2>Advancement & Playoffs</h2>
    <p class="muted">${stageName} • Top ${adv} from each bracket • First to ${$("scoreTo").value}</p>`;

  limitedGroups.forEach((group,gi)=>{
    html += `<div class="round" style="margin-top:12px"><h3>Bracket ${String.fromCharCode(65+gi)} Qualifiers</h3>`;
    html += group.length
      ? group.map(t=>`<div class="teamline">${t.group}${t.seed} — ${esc(t.name)}</div>`).join("")
      : `<div class="teamline">No qualifiers</div>`;
    html += `</div>`;
  });

  html += `<div class="round" style="margin-top:12px"><h3>${stageName}</h3>`;
  matches.forEach((m,i)=>{
    html += `<div class="matchline">
      <b>${stageName === "Semifinals" ? "Semifinal" : "Match"} ${i+1}:</b>
      ${m[0].group}${m[0].seed} ${esc(m[0].name)}
      vs
      ${m[1].group}${m[1].seed} ${esc(m[1].name)}
    </div>`;
  });
  html += `</div>`;

  if(matches.length >= 2){
    html += `<div class="round" style="margin-top:12px"><h3>Finals</h3>
      <div class="matchline"><b>Final:</b> Winner of Match 1 vs Winner of Match 2</div>`;
    if($("thirdPlace").checked){
      html += `<div class="matchline"><b>Third Place:</b> Loser of Match 1 vs Loser of Match 2</div>`;
    }
    html += `</div>`;
  }

  html += `</div></div>`;
  $("generatedContent").insertAdjacentHTML("beforeend",html);
  tstatus("Crossover playoff matches generated from bracket rankings.","ok");
}

drawWheel();updateCounts();