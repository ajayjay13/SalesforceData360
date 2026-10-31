(function(){
  var app = document.getElementById('qapp');
  var MODE = document.body.dataset.mode;
  var SECS = window.SECTIONS, ALL = window.QUESTIONS;
  var secById = {}; SECS.forEach(function(s){ secById[s.id] = s; });
  var LETTERS = 'ABCDEFGH';

  function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function shuffle(a){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function store(k,v){ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } }

  // prepare a question with shuffled options
  function prep(q){
    var order = shuffle(q.o.map(function(_,i){ return i; }));
    return { q:q, order:order, pick:null, locked:false };
  }

  var state = null; // {items, i, feedback, timerEnd, secId, title}
  var timerId = null;

  /* ------------------------------------------------------------- setup screens */
  function drillPicker(){
    document.getElementById('dt').textContent = 'Drill';
    document.getElementById('dd').textContent = 'Pick a section. Every answer shows an explanation straight away.';
    document.querySelector('body').style.setProperty('--c','var(--ink)');
    var html = '<div class="secpick">' + SECS.map(function(s){
      var n = ALL.filter(function(q){ return q.s===s.id; }).length;
      return '<a href="/drill/?s='+s.id+'" style="--c:'+s.color+'">'+esc(s.name)+'<small>'+n+' questions</small></a>';
    }).join('') + '<a href="/drill/?s=all" style="--c:var(--ink)">All sections mixed<small>'+ALL.length+' questions</small></a></div>';
    app.innerHTML = html;
  }

  function startDrill(secId){
    var pool = secId==='all' ? ALL : ALL.filter(function(q){ return q.s===secId; });
    var s = secById[secId];
    document.getElementById('dt').textContent = s ? s.name : 'All sections';
    document.getElementById('dd').textContent = 'Pick an answer to see why. ' + pool.length + ' questions.';
    document.body.style.setProperty('--c', s ? s.color : 'var(--ink)');
    state = { items: shuffle(pool).map(prep), i:0, feedback:true, secId:secId, drill:true };
    render();
  }

  function examSetup(){
    var best = store('d360-best');
    app.innerHTML = '<div class="setup">' +
      '<fieldset><legend>Mode</legend><div class="radios">' +
      '<label><input type="radio" name="mode" value="exam" checked> Exam style: answers revealed at the end</label>' +
      '<label><input type="radio" name="mode" value="practice"> Practice: explanation after each answer</label></div></fieldset>' +
      '<fieldset><legend>Timer</legend><div class="radios">' +
      '<label><input type="radio" name="timer" value="105" checked> 105 minutes</label>' +
      '<label><input type="radio" name="timer" value="0"> No timer</label></div></fieldset>' +
      '<p class="note">The paper has 60 questions picked by section weight: ' + SECS.map(function(s){ return s.q+' '+s.short; }).join(', ') + '. The pool holds ' + ALL.length + ' questions, so each attempt differs.</p>' +
      (best ? '<p>Best score so far: <b>'+best.pct+'%</b> on '+esc(best.date)+'</p>' : '') +
      '<div><button class="btn" id="go">Start the exam</button></div></div>';
    document.getElementById('go').onclick = function(){
      var mode = app.querySelector('input[name=mode]:checked').value;
      var mins = +app.querySelector('input[name=timer]:checked').value;
      var items = [];
      SECS.forEach(function(s){
        var pool = shuffle(ALL.filter(function(q){ return q.s===s.id; })).slice(0, s.q);
        items = items.concat(pool);
      });
      items = shuffle(items).map(prep);
      state = { items:items, i:0, feedback: mode==='practice', exam:true, timerEnd: mins ? Date.now()+mins*60000 : 0 };
      document.body.style.setProperty('--c','var(--ink)');
      if(state.timerEnd){ timerId = setInterval(tick, 1000); }
      render();
    };
  }

  function tick(){
    var el = document.getElementById('tm'); if(!el) return;
    var left = Math.max(0, state.timerEnd - Date.now());
    var m = Math.floor(left/60000), s = Math.floor(left%60000/1000);
    el.textContent = m + ':' + (s<10?'0':'') + s;
    if(left<=0){ clearInterval(timerId); finish(); }
  }

  /* ------------------------------------------------------------- question view */
  function render(){
    var it = state.items[state.i], q = it.q, sec = secById[q.s];
    var total = state.items.length;
    var done = state.items.filter(function(x){ return x.pick!==null; }).length;
    var h = '<div class="prog"><i style="width:'+(done/total*100)+'%"></i></div><div class="qcard" style="--c:'+sec.color+'">' +
      '<div class="qmeta"><span>Question '+(state.i+1)+' of '+total+(state.exam?'':' · '+esc(sec.short))+'</span>' +
      (state.timerEnd ? '<span class="timer" id="tm"></span>' : '<span>'+done+' answered</span>') + '</div>' +
      '<p class="qtext">'+esc(q.q)+'</p><div class="opts" role="group" aria-label="Answer options">';
    it.order.forEach(function(oi, pos){
      var cls = 'opt';
      if(it.pick===oi) cls += ' sel';
      if(it.locked){ if(oi===q.a) cls += ' good'; else if(it.pick===oi) cls += ' bad'; }
      h += '<button class="'+cls+'" data-oi="'+oi+'"'+(it.locked?' disabled':'')+'><span class="k">'+LETTERS[pos]+'</span><span>'+esc(q.o[oi])+'</span></button>';
    });
    h += '</div>';
    if(it.locked){
      var ok = it.pick===q.a;
      h += '<div class="why"><b class="'+(ok?'g':'b')+'">'+(ok?'Correct.':'Not quite.')+'</b> '+esc(q.w)+'</div>';
    }
    h += '<div class="qnav"><button class="btn ghost" id="prev"'+(state.i===0?' disabled':'')+'>Back</button>';
    var last = state.i===total-1;
    if(state.exam){
      h += '<span>'+(last ? '<button class="btn" id="fin">Finish and see results</button>' : '<button class="btn" id="next">Next</button>')+'</span>';
    } else {
      h += '<span>'+(last ? '<button class="btn" id="fin">See results</button>' : '<button class="btn" id="next"'+(it.locked?'':' disabled')+'>Next</button>')+'</span>';
    }
    h += '</div></div>';
    app.innerHTML = h;
    if(state.timerEnd) tick();
    [].forEach.call(app.querySelectorAll('.opt'), function(b){
      b.onclick = function(){
        if(it.locked) return;
        it.pick = +b.dataset.oi;
        if(state.feedback) it.locked = true;
        render();
        var f = app.querySelector('.why'); if(f) f.scrollIntoView({block:'nearest'});
      };
    });
    var p = document.getElementById('prev'); if(p) p.onclick = function(){ state.i--; render(); window.scrollTo(0,0); };
    var n = document.getElementById('next'); if(n) n.onclick = function(){ state.i++; render(); window.scrollTo(0,0); };
    var f = document.getElementById('fin');
    if(f) f.onclick = function(){
      var un = state.items.filter(function(x){ return x.pick===null; }).length;
      if(un && state.exam && !confirm(un+' question'+(un>1?'s are':' is')+' unanswered. Finish anyway?')) return;
      finish();
    };
  }

  /* ------------------------------------------------------------- results */
  function finish(){
    clearInterval(timerId);
    var items = state.items, total = items.length;
    var right = items.filter(function(x){ return x.pick===x.q.a; }).length;
    var pct = Math.round(right/total*100);
    var by = {};
    items.forEach(function(x){ var b = by[x.q.s] || (by[x.q.s]={r:0,n:0}); b.n++; if(x.pick===x.q.a) b.r++; });
    var h = '<div class="qcard" style="--c:var(--ink)"><p class="score '+(state.exam?(pct>=70?'pass':'fail'):'')+'">'+pct+'%</p>' +
      '<p><b>'+right+' of '+total+' correct.</b>' + (state.exam ? (pct>=70 ? ' That is a pass at the 70% mark.' : ' The pass mark is 70%. Review the sections below.') : '') + '</p><div class="bars">';
    SECS.forEach(function(s){
      var b = by[s.id]; if(!b) return;
      var p = Math.round(b.r/b.n*100);
      h += '<div class="brow" style="--c:'+s.color+'"><span>'+esc(s.short)+'</span><span class="t"><i style="width:'+p+'%"></i></span><span>'+b.r+'/'+b.n+'</span></div>';
    });
    h += '</div>';
    var wrong = items.filter(function(x){ return x.pick!==x.q.a; });
    if(wrong.length){
      h += '<h3>Review ('+wrong.length+')</h3>';
      wrong.forEach(function(x){
        var q = x.q;
        h += '<div class="rev" style="border-left-color:'+secById[q.s].color+'"><b>'+esc(q.q)+'</b>' +
          '<p>Your answer: '+(x.pick===null?'<i>none</i>':esc(q.o[x.pick]))+'</p>' +
          '<p>Correct: <b>'+esc(q.o[q.a])+'</b></p><p>'+esc(q.w)+'</p>' +
          '<a href="/'+q.s+'/">Study '+esc(secById[q.s].short)+'</a></div>';
      });
    }
    h += '<div class="qnav"><button class="btn ghost" id="again">Start again</button>' + (wrong.length ? '<button class="btn" id="retry">Retry the missed ones</button>' : '') + '</div></div>';
    app.innerHTML = h;
    window.scrollTo(0,0);
    if(state.exam){
      var best = store('d360-best');
      if(!best || pct>best.pct) store('d360-best', {pct:pct, date:new Date().toLocaleDateString()});
    }
    document.getElementById('again').onclick = function(){ if(state.exam) examSetup(); else if(state.secId) startDrill(state.secId); else drillPicker(); };
    var r = document.getElementById('retry');
    if(r) r.onclick = function(){
      var keep = wrong.map(function(x){ return prep(x.q); });
      state = { items: shuffle(keep), i:0, feedback:true, secId: state.secId, drill:true };
      render();
    };
  }

  /* ------------------------------------------------------------- boot */
  if(MODE==='exam'){ examSetup(); }
  else {
    var m = /[?&]s=([a-z]+)/.exec(location.search);
    if(m && (m[1]==='all' || secById[m[1]])) startDrill(m[1]); else drillPicker();
  }
})();
