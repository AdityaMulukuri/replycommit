
(function(){
  function todayKey(d=new Date()){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function increment(){
    chrome.storage.local.get(["days","settings"], res=>{
      const days = res.days || {};
      const settings = res.settings || { dailyTarget: 50 };
      const k = todayKey();
      if(!days[k]) days[k] = { count: 0, target: settings.dailyTarget };
      days[k].count += 1;
      chrome.storage.local.set({ days }, ()=> {
        flash("+1 reply");
        window.dispatchEvent(new CustomEvent('replyCommit.updated'));
      });
    });
  }
  function flash(t){
    const el=document.createElement("div");
    el.innerText=t;
    el.style.cssText="position:fixed;right:90px;bottom:90px;background:#16a34a;color:#fff;padding:8px 12px;border-radius:10px;font-weight:700;z-index:999999";
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),900);
  }
  function addButton(){
    if(document.getElementById("reply-commit-float")) return;
    const b=document.createElement("button");
    b.id="reply-commit-float";
    b.innerHTML="+";
    b.title="Mark reply (Alt/Option + R)";
    b.style.cssText="position:fixed;right:22px;top:50%;transform:translateY(-50%);width:56px;height:56px;border-radius:28px;background:#16a34a;color:#fff;font-size:26px;font-weight:800;border:none;cursor:pointer;z-index:999999;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 40px rgba(16,185,129,.22)";
    b.onclick=increment;
    document.body.appendChild(b);
  }
  window.addEventListener("keydown",e=>{
    if((e.altKey||e.metaKey)&&e.key.toLowerCase()==="r") increment();
  });
  function init(){ if(!document.body){setTimeout(init,300);return;} addButton(); }
  init();
})();
