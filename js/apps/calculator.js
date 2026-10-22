"use strict";

/* ============ APP: CALCULATOR ============ */
function renderCalculatorApp(body, api){
  body.innerHTML = `
    <div class="calc">
      <div class="calc-display"><span class="calc-display-value">0</span></div>
      <div class="calc-grid">
        <button data-act="clear" class="calc-btn calc-fn">C</button>
        <button data-act="sign" class="calc-btn calc-fn">±</button>
        <button data-act="percent" class="calc-btn calc-fn">%</button>
        <button data-act="op" data-op="/" class="calc-btn calc-op">÷</button>
        <button data-act="digit" data-val="7" class="calc-btn">7</button>
        <button data-act="digit" data-val="8" class="calc-btn">8</button>
        <button data-act="digit" data-val="9" class="calc-btn">9</button>
        <button data-act="op" data-op="*" class="calc-btn calc-op">×</button>
        <button data-act="digit" data-val="4" class="calc-btn">4</button>
        <button data-act="digit" data-val="5" class="calc-btn">5</button>
        <button data-act="digit" data-val="6" class="calc-btn">6</button>
        <button data-act="op" data-op="-" class="calc-btn calc-op">−</button>
        <button data-act="digit" data-val="1" class="calc-btn">1</button>
        <button data-act="digit" data-val="2" class="calc-btn">2</button>
        <button data-act="digit" data-val="3" class="calc-btn">3</button>
        <button data-act="op" data-op="+" class="calc-btn calc-op">+</button>
        <button data-act="digit" data-val="0" class="calc-btn calc-zero">0</button>
        <button data-act="decimal" class="calc-btn">.</button>
        <button data-act="equals" class="calc-btn calc-equals">=</button>
      </div>
    </div>
  `;

  const displayEl = body.querySelector(".calc-display-value");
  let current = "0", stored = null, pendingOp = null, freshEntry = true;

  function updateDisplay(){
    displayEl.textContent = current;
    displayEl.style.fontSize = current.length > 9 ? "22px" : "34px";
  }
  function inputDigit(d){
    if(freshEntry){ current = d==="." ? "0." : d; freshEntry = false; }
    else if(current.length < 14){ current = (current==="0" && d!==".") ? d : current+d; }
    updateDisplay();
  }
  function inputDecimal(){
    if(freshEntry){ current="0."; freshEntry=false; }
    else if(!current.includes(".")){ current += "."; }
    updateDisplay();
  }
  function compute(a,b,op){
    if(op==="+") return a+b;
    if(op==="-") return a-b;
    if(op==="*") return a*b;
    if(op==="/") return b===0 ? NaN : a/b;
    return b;
  }
  function formatResult(n){
    if(!isFinite(n)) return "Error";
    let s = String(Math.round(n*1e10)/1e10);
    if(s.replace("-","").length > 14) s = n.toExponential(6);
    return s;
  }
  function setOperator(op){
    if(pendingOp!==null && !freshEntry){
      stored = compute(stored, parseFloat(current), pendingOp);
      current = formatResult(stored);
    }else{
      stored = parseFloat(current);
    }
    pendingOp = op;
    freshEntry = true;
    updateDisplay();
  }
  function equals(){
    if(pendingOp===null) return;
    const result = compute(stored, parseFloat(current), pendingOp);
    current = formatResult(result);
    stored = null; pendingOp = null; freshEntry = true;
    updateDisplay();
  }
  function clearAll(){
    current = "0"; stored = null; pendingOp = null; freshEntry = true;
    updateDisplay();
  }
  function toggleSign(){
    if(current!=="0") current = current.startsWith("-") ? current.slice(1) : "-"+current;
    updateDisplay();
  }
  function percent(){
    current = formatResult(parseFloat(current)/100);
    freshEntry = true;
    updateDisplay();
  }

  body.querySelectorAll(".calc-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const act = btn.dataset.act;
      if(act==="digit") inputDigit(btn.dataset.val);
      else if(act==="decimal") inputDecimal();
      else if(act==="op") setOperator(btn.dataset.op);
      else if(act==="equals") equals();
      else if(act==="clear") clearAll();
      else if(act==="sign") toggleSign();
      else if(act==="percent") percent();
    });
  });

  windowKeyHandlers[api.windowId] = function(e){
    if(/^[0-9]$/.test(e.key)){ inputDigit(e.key); e.preventDefault(); }
    else if(e.key==="."){ inputDecimal(); e.preventDefault(); }
    else if(["+","-","*","/"].includes(e.key)){ setOperator(e.key); e.preventDefault(); }
    else if(e.key==="Enter" || e.key==="="){ equals(); e.preventDefault(); }
    else if(e.key==="Escape"){ clearAll(); e.preventDefault(); }
    else if(e.key==="Backspace"){ current = current.length>1 ? current.slice(0,-1) : "0"; updateDisplay(); e.preventDefault(); }
  };
}


/* Runs once at startup (see main.js), in the original order. */
function initAppsCalculator(){
  AppManager.register({
    id: "calculator",
    name: "Calculator",
    description: "A standard four-function calculator.",
    version: "1.0.0",
    developer: "on369",
    category: "utilities",
    icon: calculatorSVG,
    render: renderCalculatorApp,
    permissions: [],
    fileAssociations: [],
    shortcuts: [],
    defaultWidth: 300, defaultHeight: 420,
    minWidth: 260, minHeight: 360,
    maxWidth: 480, maxHeight: 680,
    resizable: true,
    singleton: true,
    backgroundCapable: false
  });

}
