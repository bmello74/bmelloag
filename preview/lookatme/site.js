(function(){
  // Eyes follow the pointer
  var pupils=[].slice.call(document.querySelectorAll('.pupil'));
  var still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!still){
    window.addEventListener('pointermove',function(e){
      pupils.forEach(function(p){
        var r=p.ownerSVGElement.getBoundingClientRect();
        var cx=r.left+r.width/2, cy=r.top+r.height*0.58;
        var a=Math.atan2(e.clientY-cy,e.clientX-cx);
        p.style.transform='translate('+(Math.cos(a)*3.6).toFixed(2)+'px,'+(Math.sin(a)*3.6).toFixed(2)+'px)';
      });
    },{passive:true});
  }

  // Readability tester
  var input=document.getElementById('headline'), msg=document.getElementById('msg');
  if(input){
  function score(){
    var t=input.value.trim();
    msg.textContent=t||'Your headline here';
    var w=t?t.split(/\s+/).filter(Boolean).length:0;
    var secs=w/3; // about 3 words per second at a glance
    var feet=Math.round(secs*80.7);
    document.getElementById('vWords').textContent=w;
    document.getElementById('vSecs').textContent=secs.toFixed(1);
    document.getElementById('vFeet').textContent=feet;
    var v=document.getElementById('verdictText');
    if(w===0){v.textContent='Type a headline to test it.';v.className='';}
    else if(w<=7){v.textContent='Reads in a glance. That\'s a billboard.';v.className='ok';}
    else if(w<=10){v.textContent='Close. Cut a word or two so drivers catch it all.';v.className='warn';}
    else{v.textContent='Too long for the road. Drivers will miss the end. Aim for 7 words.';v.className='warn';}
  }
  input.addEventListener('input',score); score();
  var demoOn=true, timer=null;
  var demos=['Fresh tamales. Next right.','Roofs done right. Call today.','Your business could be here.'];
  function stopDemo(){ if(demoOn){ demoOn=false; clearTimeout(timer); } }
  ['focus','pointerdown','keydown'].forEach(function(ev){ input.addEventListener(ev, stopDemo); });
  [].forEach.call(document.querySelectorAll('.chip'), function(c){
    c.addEventListener('click', function(){ stopDemo(); input.value=c.getAttribute('data-ad'); score(); input.focus(); });
  });
  function typeDemo(i){
    if(!demoOn) return;
    var target=demos[i%demos.length], n=0;
    input.value=''; score();
    (function step(){
      if(!demoOn) return;
      n++; input.value=target.slice(0,n); score();
      if(n<target.length){ timer=setTimeout(step, 70); }
      else { timer=setTimeout(function(){ typeDemo(i+1); }, 2200); }
    })();
  }
  if(!still){
    var started=false, start=function(){ if(!started){ started=true; timer=setTimeout(function(){ typeDemo(1); }, 1600); } };
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ start(); io.disconnect(); } }); },{threshold:.4});
      io.observe(input);
    } else start();
  }
  }

  // Lead form: composes a message (live site will post to a form service)
  var form=document.getElementById('leadForm');
  if(form){
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var g=function(id){return document.getElementById(id).value.trim();};
    var err=document.getElementById('formErr');
    if(!g('fName')||(!g('fPhone')&&!g('fEmail'))){err.hidden=false;return;}
    err.hidden=true;
    var text='Billboard request\n\nName: '+g('fName')+'\nBusiness: '+(g('fBiz')||'-')+'\nPhone: '+(g('fPhone')||'-')+'\nEmail: '+(g('fEmail')||'-')+'\nInterested in: '+g('fType')+'\nArea: '+(g('fArea')||'-')+'\nNotes: '+(g('fMsg')||'-');
    document.getElementById('formText').textContent=text;
    document.getElementById('mailLink').href='mailto:lookatmeincadvertising@gmail.com?subject='+encodeURIComponent('Billboard request from '+g('fName'))+'&body='+encodeURIComponent(text);
    document.getElementById('formOut').hidden=false;
  });
  document.getElementById('copyBtn').addEventListener('click',function(){
    var pre=document.getElementById('formText'), b=this;
    function sel(){var r=document.createRange();r.selectNodeContents(pre);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Selected. Press Ctrl+C';}
    if(navigator.clipboard){navigator.clipboard.writeText(pre.textContent).then(function(){b.textContent='Copied';},sel);}else sel();
  });
  }
})();
