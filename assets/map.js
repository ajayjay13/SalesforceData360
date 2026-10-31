(function(){
  var S = window.STATIONS, TOUR = window.TOUR;
  var panel = document.getElementById('panel');
  var map = document.getElementById('map');
  var nodes = {};
  [].forEach.call(map.querySelectorAll('.st'), function(g){ nodes[g.dataset.id] = g; });

  function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function show(id, fromTour){
    var s = S[id]; if(!s) return;
    Object.keys(nodes).forEach(function(k){ nodes[k].classList.toggle('on', k===id); });
    panel.style.setProperty('--c', s.color);
    panel.innerHTML = '<h3>' + esc(s.name) + '</h3><p>' + esc(s.what) + '</p><ul>' +
      s.facts.map(function(f){ return '<li>' + esc(f) + '</li>'; }).join('') +
      '</ul><div class="tr"><b>Exam trap.</b> ' + esc(s.trap) + '</div>' +
      '<a class="go" href="' + (window.ROOT||'./') + s.sec + '/">Open ' + esc(s.secname) + '</a>';
    if(!fromTour){ try{ history.replaceState(null,'','#'+id); }catch(e){} }
  }
  function clear(){
    Object.keys(nodes).forEach(function(k){ nodes[k].classList.remove('on'); nodes[k].classList.remove('dim'); });
    panel.style.removeProperty('--c');
    panel.innerHTML = '<p class="hint">Pick a station on the map to see what it does, three facts to remember, and the trap the exam sets for it.</p>';
  }

  Object.keys(nodes).forEach(function(k){
    var g = nodes[k];
    g.addEventListener('click', function(ev){ ev.stopPropagation(); endTour(); show(k); });
    g.addEventListener('keydown', function(ev){ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); endTour(); show(k); } });
  });
  document.addEventListener('keydown', function(ev){ if(ev.key==='Escape'){ endTour(); clear(); } });
  map.addEventListener('click', function(){ endTour(); clear(); });

  // deep link
  if(location.hash && S[location.hash.slice(1)]) show(location.hash.slice(1));

  // tour
  var bar = document.getElementById('tourbar'), tt = document.getElementById('tt'), tp = document.getElementById('tp');
  var i = 0, on = false;
  function step(){
    var t = TOUR[i];
    Object.keys(nodes).forEach(function(k){ nodes[k].classList.toggle('dim', k!==t.id); });
    show(t.id, true);
    tt.textContent = 'Step ' + (i+1) + ' of ' + TOUR.length + ': ' + t.h;
    tp.textContent = t.t;
    document.getElementById('tprev').disabled = i===0;
    var n = document.getElementById('tnext');
    n.textContent = i===TOUR.length-1 ? 'Finish' : 'Next';
  }
  function startTour(){ on = true; i = 0; bar.hidden = false; step(); bar.scrollIntoView({block:'nearest'}); }
  function endTour(){ if(!on) return; on = false; bar.hidden = true; Object.keys(nodes).forEach(function(k){ nodes[k].classList.remove('dim'); }); }
  document.getElementById('tourbtn').addEventListener('click', startTour);
  document.getElementById('tprev').addEventListener('click', function(){ if(i>0){ i--; step(); } });
  document.getElementById('tnext').addEventListener('click', function(){ if(i<TOUR.length-1){ i++; step(); } else { endTour(); } });
  document.getElementById('tend').addEventListener('click', function(){ endTour(); });

  // decoder filter
  var chips = document.querySelectorAll('.chip');
  [].forEach.call(chips, function(c){
    c.addEventListener('click', function(){
      var f = c.dataset.f;
      [].forEach.call(chips, function(x){ x.classList.toggle('on', x===c); });
      [].forEach.call(document.querySelectorAll('#dtab tbody tr'), function(r){ r.hidden = !(f==='all' || r.dataset.s===f); });
    });
  });
})();
