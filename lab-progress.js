(function () {
  'use strict';
  const inputTeeth = 32, smallTeeth = 16, maxToothUpgrades = 48, maxStages = 8;
  const motorRpmLimit = 1450000;
  const motors = [[.045,140],[.13,240],[.42,480],[1.12,840],[3.8,1500],[9.5,2800],[30,5200],[125,10000],[150,11000],
    [190,12100],[240,13300],[300,14500],[375,15800],[475,17200],[600,18700],[750,20300],[940,22000],
    [1180,23800],[1490,25700],[1890,27800],[2400,30000]];
  const researchLab = window.LabResearch;
  const {tiers,perks,criticalRpm} = researchLab;
  const chambers = [['常压',1,1],['低压舱',.015,.08],['真空舱',.00015,.004],['磁悬浮真空舱',.000001,.00008],['超高真空舱',2e-9,8e-6]];
  const bearings = [1,.45,.19,.075,.027,.009];
  const subdivisions = { motor:5, chamber:18, bearing:10, calibration:4 };
  const latePrice = (rank,start,growth) => growth**Math.max(0,rank-start);
  const pointScale = 100;
  function baseOutput(speed) {
    const baseline = .4 + .6*Math.log1p(speed/60)/Math.log1p(520/60);
    const speedBonus = Math.max(1,speed/1500)**.36;
    return pointScale*baseline*speedBonus;
  }
  const firstRecord = 2;
  const speedMarks = [[50000,'辉环'],[250000,'电弧'],[1000000,'日冕']];
  const spectacle = speed => speedMarks.filter(([threshold])=>speed>=threshold).length;
  const earlyRecords = [150,320,650,1500,3500,8000,18000,50000,120000,250000,550000,1000000,2500000,6000000];
  const lightMilestones = [.005,.01,.025,.05,.1,.25,.5,.75,.9,1];
  const lightPrecision = new Intl.NumberFormat('zh-CN',{maximumFractionDigits:3});
  function lightPercent(part) {
    if (part > 0 && part < .00001) return '< 0.001%';
    return lightPrecision.format(part < 1 ? Math.min(99.999,part*100) : part*100)+'%';
  }
  const stagePrices = [0,0,18,25,38,54,74,102,142,196,265,370,525,720,980,1360].map((price,n)=>price*latePrice(n,7,1.27));
  const costs = {
    count: stagePrices.slice(0,maxStages),
    ratio: Array.from({length:maxToothUpgrades}, (_,n) => (9+.4*n+.016*n*n)*latePrice(n,12,1.12)),
    motor: Array.from({length:(motors.length-1)*subdivisions.motor}, (_,n)=>(11+.9*n+.066*n*n)*latePrice(n,16,1.07)),
    material: tiers.slice(1).map(tier=>tier.fee),
    bearing: Array.from({length:(bearings.length-1)*subdivisions.bearing}, (_,n)=>(12+1.05*n+.08*n*n)*latePrice(n,10,1.095)),
    chamber: Array.from({length:(chambers.length-1)*subdivisions.chamber}, (_,n)=>(17+1.6*n+.09*n*n)*latePrice(n,8,1.09)),
  };
  const groups = [
    ['传动与动力',{ count:'加装齿轮', ratio:'同轴齿数差', motor:'马达功率', calibration:'极限校准' }],
    ['减阻与采样',{ bearing:'精密轴承', chamber:'试验舱', sample:'采样阵列', material:'齿轮材质' }],
  ];
  const titles = Object.assign({},...groups.map(([,items])=>items));
  const paths = {
    brand:'<path d="M3 18 10 6h5L8 18zm8 0 7-12h3l-7 12z" fill="currentColor" stroke="none"/>',
    count:'<path d="M4 7h16M4 12h16M4 17h16M8 4v6m8-1v6m-6-1v6"/>',
    ratio:'<circle cx="8" cy="8" r="4"/><circle cx="16" cy="16" r="4"/><path d="m11 11 2 2M8 7v2m8 6v2"/>',
    motor:'<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8z"/>',
    material:'<path d="m12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    chamber:'<path d="M4 5h16v14H4zm0 4h16m-12 5h8m-4-2v4"/>',
    bearing:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.3"/>',
    sample:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
    pause:'<path d="M9 5H6v14h3zm9 0h-3v14h3z"/>',
    play:'<path d="m8 5 12 7-12 7z"/>',
    slow:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l-3 2m1-13h4"/>',
    fit:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><circle cx="12" cy="12" r="2"/>',
    quality:'<path d="M4 17v3m5-8v8m6-13v13m5-17v17"/>',
    reset:'<path d="M3 12a9 9 0 1 1 2.64 6.36M3 12V5m0 7h7"/>',
  };
  const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  const tool = (id,name,label) => `<button type="button" id="${id}" aria-label="${label}" title="${label}">${icon(name)}</button>`;
  const key = 'gear-lab-incremental.v1';
  const $ = id => document.getElementById(id);
  const nf = new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 1});
  const fmt = value => value >= 1e7 ? value.toExponential(2) : nf.format(value);
  const rateDelta = value => Math.abs(value)<.05 ? '持平' : `${value>0?'+':''}${fmt(value)} 点/秒`;
  const rpm = gear => Math.abs(gear?.omega ?? 0) * 60 / (Math.PI * 2);
  const power = ([torque, speed]) => torque * speed * Math.PI / 120;
  const between = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
  function interpolate(levels,rank,steps) {
    const tier = Math.floor(rank/steps), value = levels[tier];
    return value * ((levels[tier+1] ?? value)/value)**((rank%steps)/steps);
  }
  const motorTorque = motors.map(([torque])=>torque), motorSpeed = motors.map(([,speed])=>speed);
  const chamberAir = chambers.map(([,air])=>air), chamberBearing = chambers.map(([, ,bearing])=>bearing);
  const calibratedMotor = (level,n) => [
    interpolate(motorTorque,level,subdivisions.motor)*1.22**(n/subdivisions.calibration),
    Math.min(motorRpmLimit,interpolate(motorSpeed,level,subdivisions.motor)*1.06**(n/subdivisions.calibration)),
  ];
  const sampling = n => 1 + .05*n;
  const installationGain = .02;
  const commission = s => 1 - .875**(s.count-2+s.ratio+s.motor+s.calibration+s.bearing+s.chamber+s.sample+s.material);
  const measuredOutput = (speed,s) => (baseOutput(speed)*sampling(s.sample)*tiers[s.active].yieldRate+.94*pointScale*commission(s))
    *(1+installationGain)**(s.count-2)*(1+.12*s.research.archive);
  const outputAt = (speed,s) => Math.max(measuredOutput(speed,s),s.outputFloor);
  const minimumUpgradeGain = rate => Math.max(3,.015*rate/(1+rate/10000)**.65);
  const sampleCost = n => Math.round((9+1.5*n+.3*n*n)*latePrice(n,12,1.05));
  const calibrationKnee = 96, calibrationBatch = 5;
  const earlyCalibrationCost = n => 17+(.78*n+.015*n*n)*1.02**Math.max(0,n-32);
  const calibrationCost = n => Math.round(n<=calibrationKnee ? earlyCalibrationCost(n)
    : earlyCalibrationCost(calibrationKnee)*latePrice(n,calibrationKnee,1.037));

  function initialState() {
    return { curve:5, pointScale, count:2, running:null, ratio:0, motor:0, material:0, active:0, balance:0,
      calibration:0, chamber:0, bearing:0, sample:0, record:firstRecord, outputFloor:0,
      research:researchLab.profile(null), guarded:true, peakRim:0, fracture:null };
  }

  function load(recordCount) {
    const initial = initialState();
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && (data.curve ?? 0) < 2) {
        for (const [name,steps] of Object.entries({motor:5,chamber:12,bearing:4,calibration:4,sample:5})) {
          if (Number.isInteger(data[name])) data[name] *= steps;
        }
      }
      if (data && (data.curve ?? 0) < 3) {
        data.bearing = Math.ceil(data.bearing*subdivisions.bearing/4);
        data.chamber = Math.ceil(data.chamber*subdivisions.chamber/12);
        if (data.material === 3) data.material = 4;
        if (data.active === 3) data.active = 4;
      }
      const supportedStages = data?.curve>=4 ? maxStages : stagePrices.length;
      if (!data || !between(data.count, 2, supportedStages) || !between(data.ratio, 0, maxToothUpgrades) ||
          !between(data.motor, 0, costs.motor.length) || !between(data.material, 0, data.curve>=5?tiers.length-1:4) || !between(data.active, 0, data.material) ||
          !Number.isFinite(data.balance) || data.balance < 0) return initial;
      for (const [name,max] of [['calibration',Number.MAX_SAFE_INTEGER],['chamber',costs.chamber.length],
        ['bearing',costs.bearing.length],['sample',Number.MAX_SAFE_INTEGER],['record',recordCount]]) {
        if (!between(data[name],name==='record'?firstRecord:0,max)) data[name] = name==='record'?firstRecord:0;
      }
      const conversion = data.pointScale === pointScale ? 1 : pointScale;
      const outputFloor = Number.isFinite(data.outputFloor) && data.outputFloor>0 ? data.outputFloor*conversion : 0;
      const count = Math.min(maxStages,data.count);
      const refund = stagePrices.slice(count,data.count).reduce((sum,price)=>sum+Math.round(price),0)*pointScale;
      const fracture = data.fracture && between(data.fracture.tier,0,tiers.length-1) &&
        between(data.fracture.stage,1,maxStages) && Number.isFinite(data.fracture.rpm) && Number.isFinite(data.fracture.limit) &&
        Number.isFinite(data.fracture.peak) && between(data.fracture.points,0,1000) ? data.fracture : null;
      const research = researchLab.profile(data.research,data.material);
      if (data.record===recordCount) research.clear = true;
      return { ...data, curve:initial.curve, pointScale, count, balance:data.balance*conversion+refund,
        running:between(data.running,2,count-1) ? data.running : null, outputFloor, research, guarded:true, fracture,
        peakRim:Number.isFinite(data.peakRim) ? Math.max(0,data.peakRim) : 0 };
    } catch { return initial; }
  }

  const canCalibrate = (s) => s.motor>=subdivisions.motor || s.calibration>0;
  function priceOf(name,s) {
    if (name==='material' && s.material>=s.research.permit) return 0;
    const raw = name === 'calibration' ? (canCalibrate(s) ? calibrationCost(s.calibration) : 0)
      : name === 'sample' ? sampleCost(s.sample) : costs[name][s[name]];
    return Number.isFinite(raw) && raw>0 ? Math.round(Math.round(raw)*(1+.23*commission(s)))*pointScale : 0;
  }
  function configuration(s) {
    return {
      geometry:[s.running ?? s.count,inputTeeth,inputTeeth+s.ratio,smallTeeth,tiers[s.active].key],
      environment:[interpolate(chamberAir,s.chamber,subdivisions.chamber)*.84**s.research.flow,
        interpolate(chamberBearing,s.chamber,subdivisions.chamber)*interpolate(bearings,s.bearing,subdivisions.bearing)],
      drive:calibratedMotor(s.motor,s.calibration),
    };
  }

  const protectionRpm = s => s.guarded ? criticalRpm(s.active)*researchLab.guard : Infinity;
  function forecast(s,estimate) {
    const {geometry,environment,drive} = configuration(s);
    return Math.min(estimate(geometry,environment,drive),protectionRpm(s));
  }

  function refitRun(research) {
    const next = { ...initialState(), research };
    const catalog = { ...next };
    let budget = 1200;
    // Budget at the starting bench so the player can fund the licensed material ladder or choose other upgrades.
    while (catalog.material<research.permit) {
      budget += priceOf('material',catalog);
      catalog.material++;
    }
    next.balance = Math.round(budget*(1+.15*research.refit));
    return next;
  }

  function afterUpgrade(name,from,estimate,priorMeasured) {
    const next = { ...from, [name]:from[name]+1 };
    if (name === 'count') next.running = null;
    let speed = forecast(next,estimate);
    const fullStageSpeed = name === 'count' ? speed : null;
    if (name === 'count') {
      const runningSpeed = forecast(from,estimate);
      const unguarded = x => forecast({...x,guarded:false},estimate);
      if (speed < runningSpeed || (speed === runningSpeed && unguarded(next)<=unguarded(from))) {
        next.running = from.running ?? from.count;
        speed = runningSpeed;
      }
    }
    let measured = measuredOutput(speed,next);
    if (name === 'material') {
      next.active = next.material;
      next.guarded = true;
      speed = forecast(next,estimate);
      measured = measuredOutput(speed,next);
    }
    // Preserve measured gains even when the current payout is above the measured rate.
    const priorOutput = Math.max(priorMeasured,from.outputFloor);
    const minimum = name === 'count' ? Math.max(3,priorOutput*installationGain) : minimumUpgradeGain(priorOutput);
    const guaranteed = priorOutput + Math.max(minimum,measured-priorMeasured);
    if (measured < guaranteed) next.outputFloor = guaranteed;
    else if (name === 'count') next.outputFloor = priorOutput + minimum;
    return { next, speed, measured, fullStageSpeed };
  }

  function start(api) {
    const lightRpm = api.lightRpm(smallTeeth);
    const records = [
      ...earlyRecords.map(speed=>[speed,Math.round(2.5*baseOutput(speed))]),
      ...[30000000,150000000].map(speed=>[speed,Math.round(16*baseOutput(speed))]),
      ...lightMilestones.map(part=>[lightRpm*part,Math.round((part===1?90:26)*baseOutput(lightRpm*part)),part]),
    ];
    let state = load(records.length);
    const elapsedAway = !state.fracture && state.rate>0 && Number.isFinite(state.at) ? Math.max(0,Math.min(7200,(Date.now()-state.at)/1000)) : 0;
    let slow = false;
    let paused = false;
    const rotations = new WeakMap();
    const root = $('progression');
    root.innerHTML = `
      <header class="lab-header">
        <span class="lab-mark">${icon('brand')}</span>
        <div class="lab-brand"><span>SINGULARITY DRIVE</span><h1>奇点传动</h1></div>
        <div class="lab-header-actions">
          <button type="button" id="labReset" title="重置实验" aria-label="重置实验">${icon('reset')}<span>重置</span></button>
          <button type="button" class="lab-switch" id="labResearchOpen" aria-expanded="false">材料研究</button>
        </div>
      </header>
      <div class="lab-layout" id="labRunView">
        <section class="lab-bench" aria-labelledby="labBenchTitle">
          <div class="lab-hero">
            <div class="lab-bench-head"><h2 id="labBenchTitle">传动台 <span>正式实验</span></h2><span class="lab-status" id="labStatus">运转中</span></div>
            <div class="lab-economy"><div><span>实验点</span><b id="labBalance"></b></div><div><span>每秒产出</span><b id="labRate"></b></div></div>
            <div class="lab-light" id="labLightGoal">
              <div><strong id="labLightTitle">终局目标 · 触及光速</strong><span id="labLightLive"></span></div>
              <progress id="labLightProgress" aria-label="末轮历史最高光速进度" max="1" value="0"></progress>
            </div>
            <div class="lab-stress" id="labStress" data-mode="safe">
              <div><strong id="labStressTitle">转速保护 · 已开启</strong><span id="labStressReadout"></span></div>
              <progress id="labStressMeter" aria-label="最大爆裂负荷" max="1" value="0"></progress>
              <button type="button" id="labGuard" title="关闭保护后，任意齿轮超出爆裂转速都会结束本轮">解除保护 · 破坏试验</button>
            </div>
          </div>
          <div id="labCanvasSlot">
            <div id="labNotice" role="status"></div>
            <section id="labFracture" aria-labelledby="labFractureTitle" hidden>
              <div><h3 id="labFractureTitle">本轮实验结束</h3><p id="labFractureSummary"></p></div>
              <button type="button" class="lab-switch" id="labFractureResearch">结算与复装 ${icon('arrow')}</button>
            </section>
            <button type="button" id="labSpectacle" aria-label="聚焦末端齿轮" title="聚焦末端齿轮" hidden></button>
            <div id="labTools" aria-label="传动台控制">
              ${tool('labPause','pause','暂停')}
              ${tool('labSlow','slow','慢放')}
              ${tool('labFit','fit','适应视图')}
              ${tool('labQuality','quality','切换画质')}
            </div>
          </div>
          <div id="labReadout">
            <div><span>末端转速</span><b id="labRpm"></b><small>rpm</small></div>
            <div><span>齿尖线速度</span><b id="labTipSpeed"></b><small id="labTipUnit"></small></div>
            <div><span>理论增速</span><b id="labRatio"></b><small id="labStages"></small></div>
            <div><span>末轮齿缘温度</span><b id="labTemp"></b><small>K</small></div>
          </div>
        </section>
        <section class="lab-shop" aria-labelledby="labShopTitle">
          <div class="lab-shop-head"><div><span class="lab-kicker">UPGRADES</span><h2 id="labShopTitle">升级台</h2></div><span id="labAvailable"></span></div>
          <div class="lab-target">
            <div><span>建议升级</span><strong id="labTargetName"></strong></div>
            <progress id="labTargetProgress" aria-label="建议升级的攒点进度" max="1" value="0"></progress>
            <div><span id="labTargetCost"></span><span id="labTargetEta"></span></div>
          </div>
          <div class="lab-record" aria-label="光速里程碑">
            <div><span>光速里程碑</span><strong id="labRecordName"></strong></div>
            <progress id="labRecordProgress" aria-label="下一项转速纪录进度" max="1" value="0"></progress>
            <div><span id="labRecordBest"></span><span id="labRecordReward"></span></div>
          </div>
          <div id="labShaftsRow" hidden>
            <label class="lab-material"><span>运行级数</span><select id="labShafts"></select></label>
            <button type="button" id="labFastest" class="lab-fastest" hidden></button>
          </div>
          <div class="lab-material"><label for="labMaterial">当前装配材质</label><select id="labMaterial"></select></div>
          ${groups.map(([group,items])=>`<section class="lab-upgrade-group" aria-label="${group}"><h3 class="lab-group-title">${group}</h3>
            ${Object.entries(items).map(([name,title])=>`<article class="lab-upgrade" data-type="${name}">
              <span class="lab-part-icon">${icon(name==='calibration'?'motor':name)}</span>
              <div class="lab-part-info"><h4>${title}</h4><div class="lab-part-values"><span class="lab-current"></span><span class="lab-change">${icon('arrow')} <strong></strong></span></div>
                <p class="lab-effect" id="labEffect-${name}"></p></div>
              <button type="button" class="lab-buy" aria-label="升级${title}" aria-describedby="labEffect-${name}"></button>
              ${name==='calibration'?'<button type="button" id="labCalibrationBatch" class="lab-batch" hidden></button>':''}
            </article>`).join('')}</section>`).join('')}
        </section>
      </div>
      <section class="lab-research" id="labResearchView" aria-labelledby="labResearchTitle" hidden>
        <div class="lab-research-inner">
          <section class="lab-research-hero" aria-labelledby="labResearchTitle">
            <div><p>RESEARCH DIVISION</p><h2 id="labResearchTitle" tabindex="-1">材料研究</h2>
              <p>主动进行超速试验，收集破裂数据。研究点、材料许可和研究升级会保留到下一轮。</p></div>
            <div class="lab-research-balance"><span>研究点</span><strong id="labResearchBalance"></strong></div>
          </section>
          <section class="lab-research-ledger" id="labResearchLedger" aria-label="实验档案" aria-live="polite"></section>
          <div class="lab-research-grid">
            <section aria-labelledby="labPerksTitle"><h3 id="labPerksTitle">永久升级</h3>
              <p>这些升级用于所有后续实验。当前材料碎裂后，系统优先预留下一份许可的研究点。</p>
              <div class="lab-research-cards" id="labPerks"></div>
            </section>
            <section aria-labelledby="labPermitTitle"><h3 id="labPermitTitle">材料许可</h3>
              <p>用研究点解锁许可，再回传动台用实验点购买同名材质。每种材料首次碎裂时发放研究点，打破最高许可材料可研究下一种。</p>
              <div class="lab-research-cards" id="labPermits"></div>
            </section>
          </div>
        </div>
      </section>
      <dialog id="labResetDialog" aria-labelledby="labResetTitle" aria-describedby="labResetDescription">
        <form method="dialog">
          <h2 id="labResetTitle">重置实验？</h2>
          <p id="labResetDescription">将清除本轮的点数、升级和转速纪录，从两级尼龙齿轮重新开始，保留研究点、材料许可和永久研究。</p>
          <div class="lab-dialog-actions"><button value="cancel" autofocus>取消</button><button class="lab-danger" value="reset">确认重置</button></div>
        </form>
      </dialog>`;
    $('labCanvasSlot').prepend(api.stage);
    root.hidden = false;
    const cards = [...root.querySelectorAll('[data-type]')].map(el => ({
      el, name:el.dataset.type, current:el.querySelector('.lab-current'), change:el.querySelector('.lab-change'),
      next:el.querySelector('strong'), effect:el.querySelector('.lab-effect'), button:el.querySelector('button'),
    }));
    const select = $('labMaterial');
    const runView = $('labRunView'), researchView = $('labResearchView');
    const researchOpen = $('labResearchOpen'), ledger = $('labResearchLedger');
    const guardButton = $('labGuard'), stressBar = $('labStressMeter');
    const fracturePanel = $('labFracture');
    const shafts = $('labShafts');
    const stat = Object.fromEntries(['Balance','Rate','Rpm','TipSpeed','TipUnit','Temp','Ratio','Stages','Status','Available','TargetName','TargetProgress','TargetCost','TargetEta','RecordName','RecordProgress','RecordBest','RecordReward','LightGoal','LightTitle','LightLive','LightProgress','Fastest','CalibrationBatch','Notice','Spectacle'].map(name=>[name,$('lab'+name)]));
    let lastOutput = 0;
    let steadyMeasured = 0;
    let steadyOutput = 0;
    let unrestricted = 0;
    let bestRpm = Number.isFinite(state.bestRpm) ? state.bestRpm : records[state.record-1]?.[0] ?? 0;
    let settledAt = performance.now();
    let fastestStages = state.count;
    let batchOffer = null;
    let storage = true;
    let noticeTimer;
    const text = (el,value) => { if(el.textContent !== value) el.textContent = value; };
    const note = message => {
      clearTimeout(noticeTimer);
      stat.Notice.textContent = message;
      noticeTimer = setTimeout(() => {stat.Notice.textContent = '';},2800);
    };

    const mat = index => api.material[tiers[index].key].name;
    const rpmLabel = speed => `${fmt(Math.round(speed))} rpm`;
    const bestRim = () => Math.max(state.peakRim,state.research.peak);
    const permitReady = () => Boolean(state.research.broken & (1<<state.research.permit));
    const watts = motor => power(motor) >= 1000 ? `${fmt(power(motor)/1000)} kW` : `${power(motor).toFixed(2)} W`;
    function value(name, next = false) {
      const index = state[name] + Number(next);
      if (name === 'count') return `${index} 级 · ${index*2} 轮`;
      if (name === 'ratio') return `${inputTeeth+index} 齿`;
      if (name === 'motor') return `${index}/${costs.motor.length} 档 · ${watts(calibratedMotor(index,state.calibration))}`;
      if (name === 'calibration') return `${index} 次${calibratedMotor(state.motor,index)[1]===motorRpmLimit?' · 转速封顶':''}`;
      if (name === 'chamber') {
        const tier = Math.floor(index/subdivisions.chamber), part = index%subdivisions.chamber;
        return `${index}/${costs.chamber.length} 档 · ${chambers[tier+Number(part>0)][0]}`;
      }
      if (name === 'bearing') return `${index}/${costs.bearing.length} 档 · 轴阻 ${fmt(100*interpolate(bearings,index,subdivisions.bearing))}%`;
      if (name === 'sample') return `基础 +${fmt(index*5)}%`;
      return mat(next ? index : state.active);
    }

    const predict = s => forecast(s,api.estimate);
    const offer = (name,from=state) => afterUpgrade(name,from,api.estimate,
      from===state ? steadyMeasured : measuredOutput(predict(from),from));

    function refreshOffers() {
      unrestricted = predict({...state,guarded:false});
      steadyMeasured = measuredOutput(Math.min(unrestricted,protectionRpm(state)),state);
      steadyOutput = Math.max(steadyMeasured,state.outputFloor);
      for (const card of cards) {
        const {name,effect} = card;
        card.cost = priceOf(name,state);
        card.gain = 0;
        card.priority = 0;
        if (name === 'material') {
          card.current.title = `末轮临界 ${rpmLabel(criticalRpm(state.active))}`;
          card.next.title = tiers[state.material+1] ? `末轮临界 ${rpmLabel(criticalRpm(state.material+1))}` : '';
        }
        text(card.current,name === 'ratio' ? `上轮 ${value(name)}` : value(name));
        if (name === 'motor') card.current.title = `空载 ${fmt(Math.round(calibratedMotor(state.motor,state.calibration)[1]))} rpm · 上限 ${fmt(motorRpmLimit)} rpm`;
        if (name === 'count') card.next.title = `每加装一级，稳定产出至少提高 ${fmt(100*installationGain)}%`;
        const materialLocked = name==='material' && !card.cost && state.material+1<tiers.length;
        card.change.hidden = !card.cost;
        effect.hidden = !card.cost && !materialLocked && !(name === 'calibration' && !canCalibrate(state));
        effect.classList.remove('is-loss');
        if (!card.cost) {
          text(card.button,materialLocked ? '缺少许可' : name === 'calibration' && !canCalibrate(state) ? '待解锁' : '已满级');
          text(effect,materialLocked ? `下一材质：${mat(state.material+1)} · 前往材料研究` : `马达到 ${subdivisions.motor} 档解锁`);
          continue;
        }
        const { next, speed:future, measured, fullStageSpeed } = offer(name);
        const output = Math.max(measured,next.outputFloor);
        card.gain = (output-steadyOutput)/steadyOutput;
        text(card.next,name === 'calibration' ? `扭矩 +${fmt((1.22**(1/subdivisions.calibration)-1)*100)}%` : value(name,true));
        const fullPreview = name === 'count' && next.count === maxStages;
        const speedLabel = name === 'count' && next.running !== null ? (fullPreview
          ? `继续运行 ${next.running} 级 · 八级预估 ${lightPercent(fullStageSpeed/lightRpm)} 光速` : `继续运行 ${next.running} 级`)
          : fullPreview ? `八级预估 ${lightPercent(future/lightRpm)} 光速`
          : name === 'sample' ? '转速不变' : future === 0 ? '负载过高' : `预估 ${fmt(Math.round(future))} rpm`;
        const change = output-steadyOutput;
        const keptMaterial = name==='material' && next.active===state.active;
        const outputLabel = next.outputFloor>measured ? '保底' : '';
        const reachesGuard = next.guarded && future>=protectionRpm(next)*.999;
        const freeSpeed = reachesGuard ? predict({...next,guarded:false}) : future;
        const speedGain = Math.max(0,Math.log((freeSpeed+10)/(unrestricted+10)));
        card.priority = (.04+Math.max(0,card.gain)*.26+4*speedGain)/card.cost;
        const releaseHint = freeSpeed>future*1.005 ? ` · 解限预估 ${rpmLabel(freeSpeed)}` : '';
        text(effect,`${keptMaterial?'保留当前装配':speedLabel} · ${outputLabel}${fmt(output)} 点/秒${releaseHint}`);
        const delta = document.createElement('span');
        delta.className = 'lab-rate-delta';
        delta.textContent = rateDelta(change);
        delta.classList.toggle('is-gain',change>=.05);
        effect.append(delta);
        effect.classList.toggle('is-loss',change<=-.05);
        text(card.button,`${fmt(card.cost)} 点`);
      }
      updateCalibrationBatch();
    }

    function updateCalibrationBatch() {
      batchOffer = null;
      stat.CalibrationBatch.hidden = true;
      if (state.calibration<calibrationKnee) return;
      let next = state, cost = 0;
      for (let i=0;i<calibrationBatch;i++) {
        const step = priceOf('calibration',next);
        if (!step) return;
        cost += step;
        next = offer('calibration',next).next;
      }
      batchOffer = {next,cost};
      stat.CalibrationBatch.hidden = false;
      text(stat.CalibrationBatch,`连续校准 ${calibrationBatch} 次 · ${fmt(cost)} 点`);
    }

    function drawTarget() {
      const offered=cards.filter(({cost})=>cost).sort((a,b)=>a.cost-b.cost);
      const best=offered.find(({name})=>name==='material') ?? offered.sort((a,b)=>b.priority-a.priority)[0];
      const available=offered.filter(({cost})=>state.balance>=cost).length;
      text(stat.Available, `${available} 项可买`);
      stat.Available.classList.toggle('is-ready', available > 0);
      stat.TargetProgress.closest('.lab-target').hidden = !best;
      if (!best) return;
      const {name,cost:goal}=best;
      const remaining = Math.max(0, goal-state.balance);
      stat.TargetProgress.max = goal;
      stat.TargetProgress.value = Math.min(goal,state.balance);
      text(stat.TargetName,titles[name]);
      text(stat.TargetCost, `${fmt(Math.min(goal, Math.floor(state.balance)))} / ${fmt(goal)} 点`);
      const seconds = Math.ceil(remaining / steadyOutput);
      text(stat.TargetEta, state.fracture ? '本轮已结束' : !remaining ? '可以购买' : paused ? '生产已暂停' : seconds < 60 ? `稳定后约 ${seconds} 秒` : `稳定后约 ${Math.ceil(seconds/60)} 分钟`);
    }

    const recordName = ([speed,,part]) => part===1 ? '100% 光速' : part ? `${lightPercent(part)} 光速` : `${fmt(speed)} rpm`;
    function drawRecord(endSpeed) {
      const next = records[state.record];
      const complete = !next;
      text(stat.LightTitle,complete ? '实验完成 · 已达光速' : '终局目标 · 八级冲击光速');
      text(stat.LightLive,`当前 ${lightPercent(endSpeed/lightRpm)} 光速`);
      stat.LightGoal.classList.toggle('is-complete',complete);
      stat.LightProgress.value = Math.min(1,bestRpm/lightRpm);
      text(stat.RecordBest,`最高 ${lightPercent(bestRpm/lightRpm)} 光速`);
      stat.RecordProgress.hidden = complete;
      text(stat.RecordName,next ? recordName(next) : '光速纪录已确认');
      text(stat.RecordReward,next ? `奖励 ${fmt(next[1])} 点` : '可继续冲击更高纪录');
      if (next) {
        const previous = records[state.record-1]?.[0] ?? 0;
        stat.RecordProgress.max = next[0]-previous;
        stat.RecordProgress.value = Math.max(0,bestRpm-previous);
      }
    }

    function draw() {
      const end = api.read().at(-1);
      text(stat.Balance,fmt(Math.floor(state.balance)));
      text(stat.Rate,`+${fmt(lastOutput)}`);
      const endSpeed=rpm(end), rank=spectacle(endSpeed), atLight=endSpeed>=lightRpm;
      text(stat.Rpm,fmt(endSpeed));
      stat.Spectacle.hidden=!rank;
      if(rank) text(stat.Spectacle,`${atLight?'光速':speedMarks[rank-1][1]} · 聚焦末轮`);
      const tipSpeed = api.tipSpeed(end);
      text(stat.TipSpeed,tipSpeed>=1000?(tipSpeed/1000).toFixed(2):tipSpeed.toFixed(1));
      text(stat.TipUnit,tipSpeed>=1000?'km/s':'m/s');
      text(stat.Temp,fmt(end?.T ?? 293.15));
      const running = state.running ?? state.count;
      text(stat.Ratio,`×${fmt(inputTeeth/smallTeeth * ((inputTeeth+state.ratio)/smallTeeth)**(running-1))}`);
      text(stat.Stages,`${running} 级`);
      text(stat.Status, state.fracture ? '齿轮碎裂 · 本轮结束' : paused ? '已暂停' : !endSpeed ? '待转动 · 基础测量' : slow ? '慢放中' : '运转中');
      const usage = endSpeed/criticalRpm(state.active);
      stat.Status.classList.toggle('is-broken',Boolean(state.fracture));
      $('labStress').dataset.mode = state.fracture ? 'broken' : state.guarded ? 'safe' : 'armed';
      text($('labStressTitle'),state.fracture ? '爆裂保护记录' : state.guarded ? '转速保护 · 已开启' : '破坏试验 · 保护已解除');
      text($('labStressReadout'),state.fracture ? `第 ${state.fracture.stage} 级已碎裂`
        : `负荷 ${Math.round(usage*100)}% · 临界 ${rpmLabel(criticalRpm(state.active))} · 解限预估 ${Math.floor(unrestricted/criticalRpm(state.active)*100)}%`);
      $('labStress').classList.toggle('can-fracture',unrestricted>=criticalRpm(state.active));
      stressBar.value = state.fracture ? 1 : Math.min(1,usage);
      text(guardButton,state.guarded?'解除保护 · 破坏试验':'恢复转速保护');
      guardButton.disabled = Boolean(state.fracture);
      stat.Status.classList.toggle('is-paused', paused);
      for (const {cost,button} of cards) button.disabled = Boolean(state.fracture || !cost || state.balance < cost);
      stat.CalibrationBatch.disabled = state.fracture || !batchOffer || state.balance<batchOffer.cost;
      if (state.fracture) { select.disabled = shafts.disabled = stat.Fastest.disabled = $('labPause').disabled = true; }
      drawTarget();
      drawRecord(endSpeed);
    }

    function settleOutput() {
      const now = performance.now();
      const elapsed = Math.min(7200,(now-settledAt)/1000);
      settledAt = now;
      if (!paused && !state.fracture) state.balance += elapsed*(document.hidden || elapsed>.5 ? steadyOutput : lastOutput);
    }

    function save() {
      settleOutput();
      if (!storage) return;
      const safe = {...state,guarded:true};
      const offlineRate = state.guarded ? steadyOutput : outputAt(Math.min(unrestricted,protectionRpm(safe)),safe);
      try { localStorage.setItem(key, JSON.stringify({ ...state, rate:paused || state.fracture ? 0 : offlineRate, bestRpm, at:Date.now() })); }
      catch { storage = false; }
    }

    function synchronize(geometry, append = false, animate = false, cold = false) {
      const config = configuration(state);
      api.drive(...config.drive);
      api.environment(...config.environment);
      if (geometry) api.build(state.count,...config.geometry,append,animate,cold);
      api.limit(protectionRpm(state));
      refreshOffers();
    }

    function listMaterials() {
      select.replaceChildren();
      for (let i=0; i<=state.material; i++) {
        const fitted = { ...state, active:i };
        const option = new Option(`${mat(i)} · ${fmt(outputAt(predict(fitted),fitted))} 点/秒`,String(i),false,i===state.active);
        option.title = `末轮临界 ${rpmLabel(criticalRpm(i))}`;
        select.add(option);
      }
      select.disabled = state.material === 0;
    }

    function listShafts() {
      shafts.replaceChildren();
      let fastest = -1;
      for (let n=state.count; n>=2; n--) {
        const speed = predict({ ...state, running:n });
        const free = predict({...state,running:n,guarded:false});
        if (free>fastest) { fastest=free; fastestStages=n; }
        shafts.add(new Option(`${n} 级${n===state.count?' · 全轴':''} · ${fmt(Math.round(speed))} rpm`,n===state.count?'':String(n)));
      }
      shafts.value = state.running ?? '';
      $('labShaftsRow').hidden = state.count===2;
      stat.Fastest.hidden = fastestStages===(state.running ?? state.count);
      text(stat.Fastest,`切到最快 · ${fastestStages} 级 · 解限预估 ${fmt(Math.round(fastest))} rpm`);
    }

    function buy(card,batch=null) {
      const {name,el} = card;
      const cost = batch?.cost ?? card.cost;
      if (state.fracture || !cost || state.balance < cost) return;
      settleOutput();
      const previousOutput = steadyOutput;
      const next = batch?.next ?? offer(name).next;
      const equip = name === 'material' && next.active!==state.active;
      const remaining = state.balance-cost;
      Object.assign(state,next,{balance:remaining});
      const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      synchronize(name === 'count' || name === 'ratio' || equip, name === 'count', motion && (name === 'ratio' || name === 'count'));
      lastOutput = paused ? 0 : outputAt(rpm(api.read().at(-1)),state);
      listMaterials(); listShafts();
      if (name === 'count') {
        api.fit();
        const slot = $('labCanvasSlot');
        const rect = slot.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > innerHeight) slot.scrollIntoView({block:'center',behavior:motion?'smooth':'instant'});
      }
      const gain = steadyOutput-previousOutput;
      const upgradeLabel = batch ? `已连续校准 ${calibrationBatch} 次`
        : name === 'count' ? `已加装第 ${state.count} 级${state.running===null?'并接入':` · 继续运行 ${state.running} 级`}`
        : name === 'material' && !equip ? `已解锁${mat(state.material)}` : `${titles[name]}已升级`;
      note(`${upgradeLabel} · 稳定产出 ${rateDelta(gain)}`);
      if (motion) {
        el.animate([{backgroundColor:'#d7eadb'},{backgroundColor:'#fafbf7'}],{duration:600});
        if (gain>=.005) stat.Rate.animate([{color:'#fff4d4',transform:'translateY(-2px)'},{color:'#b7e2b2',transform:'translateY(0)'}],{duration:440,easing:'ease-out'});
      }
      draw(); save();
    }
    for (const card of cards) card.button.addEventListener('click', () => buy(card));
    const calibrationCard = cards.find(card=>card.name==='calibration');
    stat.CalibrationBatch.addEventListener('click', () => { if (batchOffer) buy(calibrationCard,batchOffer); });
    function changeShafts(level) {
      if (state.fracture) return;
      settleOutput();
      state.running = level===state.count ? null : level;
      synchronize(true,true);
      listMaterials(); listShafts();
      lastOutput = paused ? 0 : outputAt(rpm(api.read().at(-1)),state);
      api.fit();
      note(`已切换至 ${level} 级传动`);
      draw(); save();
    }
    shafts.addEventListener('change', () => changeShafts(Number(shafts.value)||state.count));
    stat.Fastest.addEventListener('click', () => changeShafts(fastestStages));
    select.addEventListener('change', () => {
      if (state.fracture) return;
      settleOutput();
      state.guarded = true;
      state.active = Number(select.value);
      synchronize(true);
      listShafts();
      lastOutput = paused ? 0 : outputAt(rpm(api.read().at(-1)),state);
      note(`已换装 · ${mat(state.active)}`);
      draw(); save();
    });
    $('labSlow').addEventListener('click', e => {
      slow = !slow;
      e.currentTarget.setAttribute('aria-pressed', String(slow));
      draw();
    });
    $('labSlow').setAttribute('aria-pressed','false');
    function reflectPause() {
      const button = $('labPause');
      const label = paused ? '继续' : '暂停';
      button.title = label;
      button.setAttribute('aria-label',label);
      button.innerHTML = icon(paused ? 'play' : 'pause');
    }
    $('labPause').addEventListener('click', () => {
      settleOutput();
      paused = api.togglePause();
      if(paused) lastOutput = 0;
      reflectPause();
      draw(); save();
    });
    $('labFit').addEventListener('click', () => api.fit());
    stat.Spectacle.addEventListener('click', () => api.fit(true));
    $('labQuality').addEventListener('click', () => note(`画质 · ${api.quality()}`));
    function drawFracture() {
      const run = state.fracture;
      fracturePanel.hidden = !run;
      $('labReset').disabled = Boolean(run);
      $('labSlow').disabled = Boolean(run);
      if (!run) return;
      text($('labFractureSummary'),`第 ${run.stage} 级 · ${mat(run.tier)}碎裂 · ${run.points?`+${fmt(run.points)} 研究点`:'已有该材料的破裂数据'}`);
    }

    function finishRun(gear,wheel) {
      const tier = state.active;
      const {points,research} = researchLab.recordFracture(state.research,tier,state.peakRim);
      const stage = Math.floor(wheel/2)+1;
      state.fracture = {tier,wheel,stage,points,peak:state.peakRim,rpm:rpm(gear),limit:criticalRpm(tier,gear.n)};
      state.research = research;
      lastOutput = 0;
      api.breakGear(gear,true);
      stat.Notice.textContent = '';
      drawFracture();
      if (!researchView.hidden) renderResearch();
      draw(); save();
    }

    function renderResearch(focus) {
      const {research,fracture} = state;
      const next = tiers[research.permit+1];
      const reserved = reserveForPermit();
      const spendable = Math.max(0,research.balance-reserved);
      text($('labResearchBalance'),fmt(research.balance));
      const card = (title,detail,action,label,enabled) => `<article class="lab-research-card"><div><strong>${title}</strong><p>${detail}</p></div><button type="button" class="lab-buy" data-research="${action}" ${enabled?'':'disabled'}>${label}</button></article>`;
      const record = bestRim() >= 1000 ? `${fmt(bestRim()/1000)} km/s` : `${fmt(bestRim())} m/s`;
      ledger.innerHTML = fracture ? `<div><h3>第 ${research.rounds} 轮结算 · +${fmt(fracture.points)} 研究点</h3><p>${mat(fracture.tier)}在第 ${fracture.stage} 级碎裂：${rpmLabel(fracture.rpm)} / 临界 ${rpmLabel(fracture.limit)}。</p><p>复装从两级尼龙齿轮重新开始，清空本轮升级、已购材质和纪录。保留研究进度，并发放 ${fmt(refitRun(research).balance)} 启动实验点。</p></div><button type="button" data-research="${reserved?`permit-${research.permit+1}`:'rebuild'}" class="lab-buy" ${reserved>research.balance?'disabled':''}>${reserved?`许可：${mat(research.permit+1)} · ${reserved} 点`:'复装 · 开始下一轮'}</button>`
        : `<div><h3>实验档案 · 已结算 ${research.rounds} 轮</h3><p>最高齿尖速度 ${record}${research.clear?' · 已达光速':''}</p><p>${next && !permitReady()?`下一项研究：让${mat(research.permit)}碎裂。`:next?`已有数据可解锁${mat(research.permit+1)}。`:'全部材料许可已开放。'}</p></div>`;
      $('labPermits').innerHTML = tiers.map((tier,i)=>card(mat(i),`${tier.role} · 末轮临界 ${rpmLabel(criticalRpm(i))} · 齿尖 ${tier.rim>=1000?`${fmt(tier.rim/1000)} km/s`:`${tier.rim} m/s`}`,`permit-${i}`, i<=research.permit?'已许可':`${tier.permit} 研究点`, i===research.permit+1 && permitReady() && research.balance>=tier.permit)).join('');
      $('labPerks').innerHTML = perks.map(perk=>{
        const rank = research[perk.key], price = perk.prices[rank];
        const detail = `${perk.effect(rank)}${price?` → ${perk.effect(rank+1)}`:''}`;
        return card(`${perk.name} · ${rank}/${perk.prices.length}`,detail,perk.key,price?`${price} 研究点`:'已满级',Boolean(price && spendable>=price));
      }).join('');
      if (focus) (researchView.querySelector(`[data-research="${focus}"]:enabled`) ?? researchView.querySelector('[data-research]:enabled') ?? $('labResearchTitle')).focus({preventScroll:true});
    }

    function reserveForPermit() {
      return permitReady() ? tiers[state.research.permit+1]?.permit ?? 0 : 0;
    }

    function showResearch(open) {
      researchView.hidden = !open;
      runView.hidden = open;
      text(researchOpen,open?'返回传动台':'材料研究');
      researchOpen.setAttribute('aria-expanded',String(open));
      if (open) {
        renderResearch();
        researchView.scrollTop = 0;
        $('labResearchTitle').focus({preventScroll:true});
      } else {
        api.resize();
        researchOpen.focus({preventScroll:true});
      }
      if (window.scrollY) window.scrollTo(0,0);
    }

    researchOpen.addEventListener('click',()=>showResearch(researchView.hidden));
    $('labFractureResearch').addEventListener('click',()=>showResearch(true));
    researchView.addEventListener('click',event=>{
      const button = event.target.closest('button[data-research]');
      if (!button || button.disabled) return;
      const action = button.dataset.research;
      const {research} = state;
      const reserved = reserveForPermit();
      if (action==='rebuild') {
        if (!state.fracture || reserved) return;
        beginRun(refitRun(research));
        note(state.material<research.permit?'已复装 · 新材质可在升级台购买':'已复装 · 新一轮开始');
        return;
      }
      if (action===`permit-${research.permit+1}` && reserved && research.balance>=reserved) {
        research.balance-=reserved;
        research.permit++;
      } else {
        const perk = perks.find(item=>item.key===action);
        if (!perk) return;
        const rank = research[action], price = perk.prices[rank];
        if (!price || research.balance-reserved<price) return;
        settleOutput();
        research.balance-=price;
        research[action]++;
        if (action==='archive') state.outputFloor *= (1+.12*research.archive)/(1+.12*rank);
      }
      synchronize(false);
      if (!state.fracture) {listMaterials(); listShafts();}
      renderResearch(state.fracture?'rebuild':action);
      draw(); save();
    });

    guardButton.addEventListener('click',()=>{
      if (state.fracture) return;
      settleOutput();
      state.guarded = !state.guarded;
      synchronize(false);
      listMaterials(); listShafts();
      note(state.guarded?'转速保护已恢复':unrestricted>=criticalRpm(state.active)?'破坏试验开始 · 当前配置预计会超速':'保护已解除 · 当前配置预计低于爆裂转速');
      draw(); save();
    });

    function prepareBench(cold) {
      synchronize(true,false,false,cold);
      if (state.fracture) api.breakGear(api.read()[state.fracture.wheel] ?? api.read().at(-1),false);
      lastOutput = state.fracture ? 0 : outputAt(rpm(api.read().at(-1)),state);
      api.fit();
      listMaterials(); listShafts();
    }

    const resetDialog = $('labResetDialog');
    $('labReset').addEventListener('click', () => {
      resetDialog.returnValue = '';
      resetDialog.showModal();
    });
    resetDialog.addEventListener('close', () => {
      if (resetDialog.returnValue !== 'reset') return;
      beginRun({...initialState(),research:state.research});
      note('已重置实验');
    });

    function beginRun(next) {
      state = next;
      lastOutput = 0;
      bestRpm = 0;
      slow = false;
      $('labSlow').setAttribute('aria-pressed','false');
      if (paused) paused = api.togglePause();
      reflectPause();
      [shafts,stat.Fastest,$('labPause')].forEach(button=>button.disabled=false);
      prepareBench(true);
      drawFracture();
      settledAt = performance.now();
      showResearch(false);
      draw(); save();
    }

    api.resize();
    prepareBench(false);
    drawFracture();
    const offline = elapsedAway*steadyOutput;
    state.balance += offline;
    settledAt = performance.now();
    draw(); save();
    if(offline >= 1) note(`离线收益 +${fmt(Math.floor(offline))} 点`);
    setInterval(save,3000);
    addEventListener('pagehide',save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

    return {
      advance(dt) {
        if (state.fracture) return;
        const gears = api.read();
        const fastest = rpm(gears.at(-1));
        lastOutput = dt > 0 ? outputAt(fastest,state) : 0;
        settleOutput();
        if (dt > 0) {
          let worst = 0, failed = -1;
          gears.forEach((gear,i)=>{
            const v = api.tipSpeed(gear);
            state.peakRim = Math.max(state.peakRim,v);
            if (v>worst) { worst=v; failed=i; }
          });
          bestRpm = Math.max(bestRpm,fastest);
          let reward=0;
          while (records[state.record] && bestRpm>=records[state.record][0]) reward+=records[state.record++][1];
          if (reward) {
            state.balance+=reward;
            const latest = records[state.record-1];
            if (latest[2]===1) { state.research.clear = true; api.lightPulse(); }
            note(latest[2]===1 ? `实验完成 · 末轮达到光速 · +${fmt(reward)} 点`
              : `${latest[2]?'光速里程碑':'转速纪录'} · ${recordName(latest)} · +${fmt(reward)} 点`);
            save();
          }
          if (worst>=tiers[state.active].rim) {
            finishRun(gears[failed],failed);
            return;
          }
        }
        const factor = slow ? Math.min(.25, 80 / Math.max(1,fastest)) : 1;
        for (const gear of gears) {
          const prior = rotations.get(gear) ?? { physical:gear.angle, shown:gear.angle };
          let change = gear.angle - prior.physical;
          // Recover whole turns from the shared shaft velocity before changing display time.
          change += Math.round((gear.omega*dt-change)/(Math.PI*2))*Math.PI*2;
          prior.shown = (prior.shown + change*factor) % (Math.PI*2);
          prior.physical = gear.angle;
          rotations.set(gear,prior);
        }
      },
      angle(gear) { return rotations.get(gear)?.shown ?? gear.angle; },
      shutterOpen() { return !slow; },
      spectacle,
      draw,
    };
  }

  window.LabProgress = { start };
})();
