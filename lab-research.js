(function () {
  'use strict';
  const light = 299792458;
  const guard = .88;
  const tiers = [
    ['nylon',    100,       0,     0, 1,    '低速试验 · 聚合物'],
    ['pom',      170,       3,    19, 1.04, '低速试验 · 低吸水聚合物'],
    ['s45c',     260,       6,    34, 1.08, '机械试验 · 通用承载'],
    ['sus303',   355,       9,    84, 1.12, '机械试验 · 耐蚀传动'],
    ['scm415',   500,      13,   310, 1.16, '机械试验 · 表面硬化'],
    ['carbon',   900,      19,   850, 1.20, '复合材料 · 高比强度轮缘'],
    ['ceramic',  250000,   29,  2100, 1.26, '试验材料 · 假想自约束陶瓷'],
    ['lattice',  3000000,  44,  5400, 1.33, '科幻材料 · 主动承载晶格'],
    ['field',    30000000, 65, 15000, 1.41, '科幻材料 · 场束缚轮缘'],
    ['singular', 1.18*light,95,52000, 1.50, '科幻终局材料 · 可承受光速冲线'],
  ].map(([key,rim,permit,fee,yieldRate,role])=>({key,rim,permit,fee,yieldRate,role}));
  const perks = [
    { key:'archive', name:'数据归档', prices:[3,7,13], effect:n=>`实验点产出 +${12*n}%` },
    { key:'refit', name:'复装工艺', prices:[4,8,15], effect:n=>`复装启动资金 +${15*n}%` },
    { key:'flow', name:'流场修整', prices:[5,10,18], effect:n=>`气阻 ×${(.84**n).toFixed(2)}` },
  ];
  const whole = (n,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n>=0 && n<=max ? n : 0;
  function profile(raw, legacy=0) {
    return { balance:whole(raw?.balance), permit:Math.max(whole(raw?.permit,tiers.length-1),legacy),
      broken:whole(raw?.broken,(1<<tiers.length)-1), rounds:whole(raw?.rounds),
      peak:Number.isFinite(raw?.peak) ? Math.max(0,raw.peak) : 0,
      clear:raw?.clear===true, ...Object.fromEntries(perks.map(p=>[p.key,whole(raw?.[p.key],p.prices.length)])) };
  }
  function criticalRpm(tier, teeth=16) {
    const tipRadius = (teeth+2)*.001;
    return tiers[tier].rim/tipRadius*30/Math.PI;
  }
  function recordFracture(research,tier,peak) {
    const mark = 1<<tier;
    const first = (research.broken&mark)===0;
    const next = tiers[research.permit+1];
    const bonus = first && tier===research.permit && next ? next.permit : 0;
    const points = first ? 5 + Math.floor(2*Math.log10(1+peak/100)) + bonus : 0;
    return { points, first, research:{...research,balance:research.balance+points,
      broken:research.broken|mark,rounds:research.rounds+1,peak:Math.max(research.peak,peak)} };
  }
  window.LabResearch={tiers,perks,guard,profile,criticalRpm,recordFracture};
})();
