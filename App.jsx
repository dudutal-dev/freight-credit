const { useState, useMemo, useEffect, useCallback } = React;

// ══════ MOBILE HOOK ═══════════════════════
function useIsMobile(){ 
  const [m,setM]=useState(typeof window!=="undefined"&&window.innerWidth<700);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<700);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return m;
}

// ══════ CONFIG ════════════════════════════
const CFO_LIMIT = 200000; // USD — requests ABOVE this go to committee
const PFX = "fcm:req:", IDX = "fcm:idx", SK = "fcm:settings";

const ROLES = {
  sales:     { label:"מנהל מכירות",   icon:"👤", color:"#3B82F6", desc:"פתיחת בקשות אשראי חדשות" },
  referent:  { label:"רפרנטית אשראי", icon:"🔍", color:"#8B5CF6", desc:"בדיקת BDI, דירוג וסקירת סיכון" },
  cfo:       { label:'סמנכ"ל כספים',  icon:"💼", color:"#F59E0B", desc:`אישור בקשות עד $${(CFO_LIMIT/1000).toFixed(0)}K` },
  committee: { label:"ועדת אשראי",    icon:"⚖️", color:"#EF4444", desc:`אישור בקשות מעל $${(CFO_LIMIT/1000).toFixed(0)}K` },
  admin:     { label:"מנהל מערכת",    icon:"⚙️", color:"#64748B", desc:"הגדרות ואנשי מכירות" },
};

const ST = {
  draft:              { l:"טיוטה",                c:"#64748B", bg:"#1E293B", i:"📝" },
  submitted:          { l:"ממתינה לסקירה",        c:"#8B5CF6", bg:"#1e1040", i:"📤" },
  in_review:          { l:"בסקירת אשראי",         c:"#FBBF24", bg:"#271b06", i:"🔍" },
  pending_cfo:        { l:'ממתינה לסמנכ"ל',      c:"#F59E0B", bg:"#271b06", i:"💼" },
  pending_committee:  { l:"בועדת אשראי",          c:"#F97316", bg:"#2a1505", i:"⚖️" },
  approved:           { l:"אושרה",                c:"#10B981", bg:"#022c22", i:"✅" },
  conditional:        { l:"אושרה בתנאים",         c:"#06B6D4", bg:"#0a2436", i:"📋" },
  rejected:           { l:"נדחתה",                c:"#EF4444", bg:"#2d0707", i:"❌" },
  agreement_pending:  { l:"הסכם — טרם החל טיפול", c:"#A78BFA", bg:"#1e0f40", i:"📄" },
  agreement_sent:     { l:"הסכם — נשלח ללקוח",   c:"#38BDF8", bg:"#0a2030", i:"✉️" },
  agreement_signed:   { l:"הסכם — נחתם ✓",       c:"#34D399", bg:"#022c22", i:"🖊️" },
};

// Agreement status labels for tracking
const AGR_STATUSES = [
  { v:"agreement_pending", l:"📄 טרם החל טיפול", c:"#A78BFA" },
  { v:"agreement_sent",    l:"✉️ נשלח ללקוח",   c:"#38BDF8" },
  { v:"agreement_signed",  l:"🖊️ נחתם",          c:"#34D399" },
];

const INDUSTRIES = ["-- בחר ענף --","יבוא ויצוא כללי","שילוח בינלאומי ולוגיסטיקה","ספנות ותובלה ימית","תובלה אווירית","תובלה יבשתית ומשלוחי מטען","מחסנאות ואחסנה","מסחר סיטונאי","מסחר קמעונאי","מסחר מקוון","ייצוא חקלאי","תעשייה ומוצרי צריכה","תעשייה כבדה ומתכות","תעשיית פלסטיק וגומי","תעשיית נייר ואריזה","תעשיית עץ ורהיטים","תעשיית כימיקלים","מזון ומשקאות","מוצרי מזון מעובד","ייבוא מוצרי מזון","טכנולוגיה ותוכנה","סייבר ואבטחת מידע","תקשורת וסלולר","מכשור רפואי וביומד","אלקטרוניקה ומוצרי חשמל",'נדל"ן ובינוי',"קבלנות ועבודות תשתית","חומרי בניין","פארמה ותרופות","מוצרי בריאות ותוספי תזונה","ציוד רפואי","אנרגיה ודלק","אנרגיה מתחדשת","גז ופטרוכימיה","הלבשה, הנעלה ואופנה","תכשיטים ואביזרים","ספורט ופנאי","מוצרי תינוקות וצעצועים","מוצרי בית וגינה","שירותים עסקיים ויעוץ","פיננסים, בנקאות וביטוח","נסיעות ותיירות","מלונאות ואירוח","מסעדנות ומזון מהיר","חינוך והכשרה","מדיה ופרסום","שמירה ואבטחה","ניקיון ותחזוקה","כוח אדם ומיקור חוץ","חקלאות ומוצרי טבע","פרחים ומשתלות","דיג ומוצרי ים","רכב, ציוד כבד ורכבים מסחריים","חלפי רכב ואביזרים","ממשלה ורשויות מקומיות","עמותות וארגונים ללא מטרת רווח","אחר"];

// ══════ BDI 1–10 SCALE ═══════════════════
const BDI_SCORE_MAP = {1:30, 2:27, 3:24, 4:20, 5:14, 6:8, 7:5, 8:2, 9:0, 10:0};
const BDI_META = {
  1:{cat:"ללא סיכון",    color:"#10B981", bg:"#022c22", blocked:false},
  2:{cat:"ללא סיכון",    color:"#10B981", bg:"#022c22", blocked:false},
  3:{cat:"ללא סיכון",    color:"#10B981", bg:"#022c22", blocked:false},
  4:{cat:"ללא סיכון",    color:"#4ADE80", bg:"#022c22", blocked:false},
  5:{cat:"סיכון נמוך",   color:"#86EFAC", bg:"#052e16", blocked:false},
  6:{cat:"סיכון בינוני", color:"#FBBF24", bg:"#271b06", blocked:false},
  7:{cat:"סיכון בינוני", color:"#F59E0B", bg:"#271b06", blocked:false},
  8:{cat:"סיכון גבוה",   color:"#F97316", bg:"#2a1505", blocked:false},
  9:{cat:"גבוה מאוד ⛔ אסור לאשראי", color:"#EF4444", bg:"#2d0707", blocked:true},
 10:{cat:"גבוה מאוד ⛔ אסור לאשראי", color:"#EF4444", bg:"#2d0707", blocked:true},
};

const SCORING = {
  // BDI: stores the RATING (1-10); score computed via BDI_SCORE_MAP in calcScore
  bdi:[
    {l:"1 — ללא סיכון",              v:1},
    {l:"2 — ללא סיכון",              v:2},
    {l:"3 — ללא סיכון",              v:3},
    {l:"4 — ללא סיכון",              v:4},
    {l:"5 — סיכון נמוך",             v:5},
    {l:"6 — סיכון בינוני",           v:6},
    {l:"7 — סיכון בינוני",           v:7},
    {l:"8 — סיכון גבוה",             v:8, rf:true},
    {l:"9 — סיכון גבוה מאוד ⛔",    v:9, rf:true, blocked:true},
    {l:"10 — סיכון גבוה מאוד ⛔",   v:10, rf:true, blocked:true},
  ],
  klal:[{l:"כיסוי מלא",v:30},{l:"כיסוי חלקי 60%–99%",v:21},{l:"כיסוי חלקי <60%",v:12},{l:"סירוב — לקוח ותיק חיובי",v:4},{l:"סירוב — לקוח חדש / בעייתי ⚠",v:0,rf:true}],
  hSen:[{l:"מעל 5 שנים",v:8},{l:"2–5 שנים",v:5},{l:"מתחת לשנתיים",v:2},{l:"לקוח חדש",v:0}],
  hTime:[{l:"תמיד במועד",v:10},{l:"איחורים עד 15 יום",v:7},{l:"איחורים 15–45 יום",v:3},{l:"מעל 45 יום ⚠",v:0,rf:true}],
  hDebt:[{l:"אף פעם לא",v:7},{l:"חד פעמי ונפתר",v:4},{l:"חוזר ⚠",v:0,rf:true}],
  bSen:[{l:"מעל 10 שנים",v:4},{l:"5–10 שנים",v:2},{l:"מתחת ל-5",v:1}],
  bSec:[{l:"יציב (מזון, פארמה, תעשייה)",v:4},{l:"בינוני",v:2},{l:'תנודתי (נדל"ן, אופנה, סטארטאפ)',v:1}],
  bStr:[{l:"חברה ציבורית / בת קבוצה",v:4},{l:"חברה פרטית מבוססת",v:2},{l:"עצמאי / חברה קטנה",v:1}],
  fDebt:[{l:"מתחת ל-1",v:4},{l:"1–2",v:2},{l:"מעל 2",v:0}],
  fCurr:[{l:"מעל 1.5",v:3},{l:"1–1.5",v:2},{l:"מתחת ל-1",v:0}],
  fRev:[{l:"צמיחה",v:3},{l:"יציבות",v:2},{l:"ירידה",v:0}],
  exp:[{l:"הובלה בלבד (חשיפה A)",v:3},{l:"הובלה + מיסים עד 30%",v:2},{l:"הובלה + מיסים מעל 30%",v:1},{l:"מיסים בלבד ⚠",v:0,rf:true}],
  terms:[{l:"שוטף",v:3},{l:"שוטף + 30",v:3},{l:"שוטף + 60",v:2},{l:"שוטף + 90",v:1},{l:"שוטף + 120",v:0},{l:"אחר",v:1}],
  ratio:[{l:"עד 8% משווי משלוחים",v:3},{l:"8%–20%",v:2},{l:"20%–40%",v:1},{l:"מעל 40% ⚠",v:0,rf:true}],
};

// ══════ LOGIC ════════════════════════════
function calcScore(f){
  // BDI: f.bdi stores the rating (1-10), score is looked up from map
  const c1 = f.bdi !== null && f.bdi !== undefined ? (BDI_SCORE_MAP[f.bdi] ?? 0) : 0;
  const c2=f.klal??0;
  const c3=(f.hSen??0)+(f.hTime??0)+(f.hDebt??0);
  const c4=(f.bSen??0)+(f.bSec??0)+(f.bStr??0);
  const hasFin=f.fDebt!==null||f.fCurr!==null||f.fRev!==null;
  const c5=Math.round(hasFin?(f.fDebt??2)+(f.fCurr??1.5)+(f.fRev??1.5):5);
  const c6=f.exp??0,c7=f.terms??0,c8=f.ratio??0;
  const raw=c1+c2+c3+c4+c5+c6+c7+c8;
  const bdiBlocked = f.bdi !== null && BDI_META[f.bdi]?.blocked;
  return{c1,c2,c3,c4,c5,c6,c7,c8,raw,norm:Math.min(Math.round((raw/120)*100),100), bdiBlocked};
}
function getFlags(f){
  const fl=[];
  // BDI rating-based flags
  if(f.bdi===9||f.bdi===10) fl.push(`⛔ BDI דירוג ${f.bdi}: אסור לאשראי — חסום אוטומטית`);
  else if(f.bdi===8) fl.push("BDI דירוג 8: סיכון גבוה — דיון מיוחד חובה");
  if(f.klal===0)fl.push("כלל סירבה + לקוח חדש");
  if(f.hTime===0)fl.push("איחורי תשלום מעל 45 יום");
  if(f.hDebt===0)fl.push("היסטוריית חוב חוזרת");
  if(f.exp===0)fl.push("מיסים בלבד — בטחון חובה");
  if(f.ratio===0)fl.push("מסגרת מעל 50% מהמחזור");
  if(f.terms===2&&f.exp!==null&&f.exp<=1)fl.push("שוטף+120 + מיסים מעל 30% — בטחון חובה");
  return fl;
}
function getRec(n){
  if(n>=85)return{l:"נמוך מאוד",r:"אישור בסמכות מנהל חטיבה",c:"#10B981",bg:"#022c22",t:1};
  if(n>=70)return{l:"נמוך",r:"אישור מנהל — דיווח לוועדה",c:"#4ADE80",bg:"#022c22",t:2};
  if(n>=55)return{l:"בינוני",r:"ועדת אשראי מחליטה",c:"#FBBF24",bg:"#271b06",t:3};
  if(n>=40)return{l:"גבוה",r:"ועדה — בטחונות חובה",c:"#F97316",bg:"#2a1505",t:4};
  return{l:"קריטי",r:"המלצת סירוב",c:"#EF4444",bg:"#2d0707",t:5};
}

// ══════ STORAGE (shared=true for multi-user) ═══
// ══ API STORAGE (שרת החברה) ══════════════
async function dbGet(key){try{const v=localStorage.getItem('fcm_'+key);return v?JSON.parse(v):null;}catch(e){return null;}}
async function dbSet(key,val){try{localStorage.setItem('fcm_'+key,JSON.stringify(val));}catch(e){if(e.name==='QuotaExceededError')alert('אחסון מלא');throw e;}}
async function dbLoadSettings(){
  const s = await dbGet(SK);
  return s || {salesReps:[],users:[],cfoLimit:CFO_LIMIT};
}
async function dbSaveSettings(s){
  await dbSet(SK, s);
}

async function dbSaveReq(req){
  const id=req.id||`${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
  const now=new Date().toISOString();
  const record={...req,id,updatedAt:now,...(!req.id?{createdAt:now}:{})};
  await dbSet(PFX+id,record);
  let idx=await dbGet(IDX)||[];
  const s=makeSummary(record);
  const ei=idx.findIndex(r=>r.id===id);
  if(ei>=0)idx[ei]=s;else idx.unshift(s);
  await dbSet(IDX,idx);
  return id;
}
function makeSummary(r){
  return{id:r.id,createdAt:r.createdAt,updatedAt:r.updatedAt,customerName:r.sales?.customerName||"ללא שם",hp:r.sales?.hp,amount:r.sales?.requestedAmount,paymentTerms:r.sales?.paymentTerms,status:r.status,salesPerson:r.sales?.salesPerson,score:r.score?.norm,level:r.rec?.l,color:r.rec?.c,flags:r.flags?.length||0,priority:r.priority};
}
async function dbLoadIdx(){return await dbGet(IDX)||[];}
async function dbLoadReq(id){return await dbGet(PFX+id);}
async function dbDelReq(id){
  try{ localStorage.removeItem('fcm_'+PFX+id); }catch(e){}
  const idx=(await dbGet(IDX)||[]).filter(r=>r.id!==id);
  await dbSet(IDX,idx);
}


// ══════ EMAIL NOTIFICATIONS ══════════════
function getEmailForRole(settings, role){
  const users = settings?.users||[];
  const user = users.find(u=>u.role===role);
  return user?.email||"";
}
function sendEmailNotification(to, subject, body){
  if(!to) return;
  const link = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(link, "_blank");
}

// ══════ BRAND & THEMES ═══════════════════
const BRAND={navy:"#1B2E6B",teal:"#00B4C8",tealD:"#008FA0",navyL:"#2A4299"};
const LOGO_URI="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAArAR4DASIAAhEBAxEB/8QAHQAAAgIDAQEBAAAAAAAAAAAABwgGCQAEBQMBAv/EAEkQAAEDAwICBQYHDQcFAAAAAAECAwQABQYHERIhCBMxQVEUIjJhcYEzN3J1kbGyFRYjNDVCVXSUobPB0hclNlJUYtFzgqLD4f/EABsBAAIDAQEBAAAAAAAAAAAAAAABAgQFAwYH/8QALhEAAQQBAwIDBgcAAAAAAAAAAQACAxEEEiExBRMGMkEUUWFxsfAicpGhwdHx/9oADAMBAAIRAxEAPwBq9Qspt+F4dccluW5YhNcQQDzcWeSUD1kkCkJ1E1bzrN7g89cr3Kiw1qPVwIjqm2G09wIHpH1q3piumXlVhuGlrdrtWQWubIXcWi7HjS0OL4UgncpSSQAdqUSzMx5F5gx5aw3GdlNNvLJ2CUFYCjv3cieda+DC0M1kbqJWslToPWtlziHMLTvuD7RVjWhLrr2juLOvOLccVbmypS1EqJ9ZNedjyLSm3wY1mtV9xNthIS00w1JZ87uA2B5k/vqS3e8WDGoTK7rcrdaIq1dWyX3UMoJ234U77Ds3O1VsrIMwDdNJgUupWVHrZm+G3Oe1At2VWWXLeOzTLM1ta1nbfYAHc1vX/ILFj7Afvl4gW1tXoqlSEt8Xs3PP3VT0m6pNamoV0nWTBb5d7Yx182HBdeYb234lpSSOVVuXy+3i/wBzXdrxdJU+a6rjL7zhUrft5eA8AOyrLbBfrFkdvcmWW6QrnESotuOMOhxIO3MHb1HsoH5Dpt0brneX5r17tMF1bhLrEW9pab4t+fmcXm8+4bVdw5mxWHNNpEL8dCbL8kyDHb1ar3KkTotscaESS+oqWAsK3b4jzIGwPPs4qYeoxppbsMtWLtQ8EFuNpQsjjhOhxK1/nFSwTxK8dzUnqrO4PkJApNZUL1ylyoOkWTzIMl6LJagLU28ysoWg+II5g175LqVgONvKZvWW2mI8nkpovha0+1KdyPfQ21g1i0zv+luR2m05dCkzpMFbbLIQ4kuK8BukVKKJ5cDWyEoy8/zzqifv2yT0f0m9/VVhWlkh+XpvjsmU+4++7bmVOOOKKlLUUjcknmTVaK/glfJqynSH4rsZ+bGfsCr3UWgNbQUWqVVlZUVyjUbBMYdLN9yu1Qnk+k0p8KcT7Up3I+issNLjQCkpVWUOoeuOk8t8MM5vbeNR2HGFoH0qSBU8ts+Dc4aJlumR5kZwboeYdDiFewjlTcxzfMKQtmsrVulwg2uC7PuUyPDiNDdx59wIQgesnkK4KNQ8CWtKEZnj6lKICQLg1uSewdtINJ4CFKKyuZf8gsePwvLb3d4NujkcnJD6UBXs3PP3VC066aSqf6kZxbuPfb0XNt/bw7VJsb3bgIRHrK07NdbZeYDdwtFwiz4jnovR3Q4g+8VuVAikLKyoxlGoGE4w4Wr9lFrgup9Jpb4Lg9qRuR9FRwa86RFfCM4ge0tugfZqYie4WAUIlVlR/Es0xPLOsGN3+Bc1NJCnEMO7qSD3lPaBUgqJBBooWVlaUi622OrhemspI7QFb/VXyPd7Y+rhamsk+BO3109DqulDusurC3qyvg5jcVq3a5W+0wHJ90mx4URrbrH33AhCd+XMnkKjyprbrKjDeoeBuOJbbzPH1LWQlKRcGtyT2Dtrp5FkNix2J5XfrxBtrPcqS8lHF7AeZ91S0O4pC6lZQ4b100lW+GE5xbuMnYbpcA39pTtU8tNyt13gNz7VOjTojnoPR3QtCveOVDmOb5hSFXhnOk2c4PaE3fJLO1DiLdDIcTIQslZBIGwO/cah0OO7MmMQ46eN6Q6lptO+26lEAD6SKdHpw/FJE+dGvsqpPMQ/xdZPnKN/FTW7jTOlj1FRIRHh9HnVqPMYkJxuOFNOJWCJrXLYg+NHbpxxQ9pLbnlp3Me6NK9m6Fp/nTAHtoF9Nv4nEfOTP86z2ZLppmavROqSbYje5eL5Nb8htiWvLYDvXM8ad08WxHMd451vTl5lqDfJFzej3fIZ7qt1raYW9w+oBIISB4CuRZmm3rzBZdSFtuSWkLSexSSsAj6Ks3sFst1otMeBaoMaDFbQAhlhsISOXgPrq9k5AgINWSkAgp0NrHeLFppeot6tM22PruC1pblMKaUpPVp5gKA3FJnfUJ+7tx81P4493f71VaFJ/FnfkH6qq/vv5duP6499tVccKTuPe730meE6nQoAGiqABt/eD/1ihj0qtabtJyGZg+Kz3IVvhqLVwksK4XJDv5zYUOYSnsO3ad6JfQyWW9DFOAElM2SoAdp2pKbjJem3CTMkKK3n3luOKPeoqJJpQRNfkPcfRB4XXwjDMlza7Lt+M2l64SUjjdUCAhsHvWs8hUyyrQTUvGrDKvl0tkAQojZdfUzNStSEjtO3f7qYXoOwobOkkqc0lHlUq5uh9Q7SEbBIPu+uiD0gPiWyv5uX/KiTMeJtAG10lSrmc+CV8k1ZTpD8V2M/NjP2BVay/gVfJqyjSM7aWY0dt9rYydv+wU+o+VqGpfOlhrVdI96kYHiU5cNEccFzmMq2cUsjm0hQ9EDvI578qXjDsTyPNLybdjlrkXKZt1jnCeSE7+ktR5Ab+JrTyOW/PyO6TZSyt9+Y8txR7SSs1L9Ls01IxCDMTgzLoYlOAyHG7YJBUpI5DiKTttv2eurLI+1HTOUcrzz3SLP8ItYumQ2Pq4PEEqkMvJdQgnsCtuz6q89H9R75pzk8e4W6S6u3LcAnQSr8G+3vz5dgUB2KqTZTqTrdk+PTLBe486Rb5rfVvtiy8BUncHkQnccwKG68YyXgI+9279n+ic/4qTbc2paR8k+2vDkW89H/ACaXGUHY8izqksq29IcIWk/VVeiUpBCgkAg7g7U++Tx34nRMfjSQtLzeJoStKxspJDA3BHq7PdSEDsqtgbNcPigqXNW7ULUy6uTm4V6ySUkBCnQhS0NgDknc+akerlXIynGcgxaem35HZ5drkqTxpbkI24k+IPYR7KsB0Bbba0VxANNobCrSwtXCkDdRQCSdu8+NA3p8pHXYkrYcXDJG/ft+Doiyy6XtgUEUh50RMrudi1ct1kYfcNuvRUxIj8XmcQQVJXt3EcJG/ro+9MHUG64ZhcG2WKQuJPvTq2zJQdltNIAK+E9yjxAb+2li6Nnx74j+uq/guU1fSm0vueo+LwHrCto3a1OLW0y4rhS+hYAUni7leaCN+XbUMgMGS0u4QOEluHYzfc3ydqy2NgTbnJ4l/hXQncAbqUpSqJrnRj1WSgKTFsyzt6IngfWmhve8WzLEZwVdLJebRIaV5jvVLRsfFK08veDXexvWnU+xKSIWYTn22+XVTNpCR6vPBP76tv7h3jIQj/0TdNMzwLMr49k9nENmRCQhp5DyHELUF7kAg7/uo151JlNJYZbWpDDgPEU8uI+BoOaC9IxzLcgi4tl1vjxLhKPBFmRiQ06vbkhST6JPcQdt+WwphZrMZ+MtEtCFM7bq4+wevfurKmc9s2qQLnPGZIy0GkMKyve+3fAoLykJyHzwdihlJeA945fvrj/fVhX6bmfsJ/5q+1kjhYaf0K8rLlY0TtLpWX+Yf2pPYr3It7qW3Fqcik7KQTvw+sVrdJVpuZoNlQHCpKoQWkn1LSQa4P31YV+m5n7Cf+a6+qUmLO6Ol9kxHVvxnLWstrcRwlQ37x3VXmhcx7XlpG/upavSs6KcmNkgdQvYg/RV+oASpK0gBSSFA7dhFS9q16h6m3Z65twL3kssnZyRwKWlP+3iPmpHqG1Q4/BH5NWS6MtNM6T4qllpDaTao6iEJCQSWwSeXeTVvKn7IBAsrZAVeOUY3fsXuIt2RWiXbJRTxpakI2Kk+IPYR7Kk2kOqGQ6aTZjtnWHo8tsJciundviBBCwO5W2438DRh6e4H3axZWw36h4b7c/SFLJU43CeIFw5RwnW6cPxSRPnRr7KqTzEP8XWT5yjfxU0/Ov1htWQ4YzCvEXylhMtCwjrFI84A890kHvoI2XTPCGL1AfaspS43KaWg+VvHYhYIPp+NU8SZrIqKdWmyPbQL6bfxOI+cmf50dD20Pte7Ha8gwdMG7xfKY/lTa+DrFI5jfY7pINZ8DtMjSU1X7YPy/bf1xn7aas/j/i7fyB9VKdbtMcHauMV1FkIWh9Cknyt7kQoEfn02bYAbSB2BIq1nSh+mkgKX5k/izvyD9VVf338u3H9ce+2qrQnAC2oHsKSDSl3HTHB3LjKcXZCVLfWpR8re5kqJP59PBlEeq0yLRG6FQCtFEpPYbhIB+kUqGs2HTcG1DulklMKQwXlPQnNvNdYUSUkHv27D4EGnh0HslssGBpgWmN5NG8pcXwdYpfMnmd1EmujqniGNZbjEhnIrRHuAjtqcYUvdK2lbdqVJIUPcaUeT25nH0KRCRnSTVnK9NHZKbGqLIhSlBT0OWgqbKgNuIbEFJ28DzqQai9IXPMzsj9jeRbbZb5SOrfbiMkqdSe4qUSR7tqGGRR2Yl8mxo6OBpp5SUJ3J2APiedNh0QsExGXjKcll2KLKuoJSl9/dzhBHclRKQfWBvV6ftRjuubZSCUBQ3SU+I2px+i3rBcMsuEHB3LLFiR7ZauclLylrdKNkjlsAn99L50irBaMa1XutrscJEKEhQUllClFKSeZ23J2Hq7KMfQbs1tL1xvhjf3glosh3rFegTzHDvt3eFRyix8Gsj5IHKEnSL08uGBagTlGMv7i3B9ciBIA8whR3LZPcpJPZ768NGdXcj0wkyU2xmPPt0tQU/DkEgFQ5cSVDmk7cu8Hwp/r5aLXfba7bbzb40+G6NlsvthaT7j3+ukn6TmE4viN6DeO2pMBCzuUpecUPcFKO3urnj5LZh23hBCILXS8a6n8Lgzod8ETwU/SUb1ybp0tshfUlu04jbYhUoJ45Mlb2258EhNLVRr6OmD4tlM1r7vWsTNlb7F9xA3HMeioV0fjQRjUWoFlNbrud9FstJ77S8f/ABquYdlWZahwYtxwS9W+Y11sZ+E424jiKeJJHMbggj3UsA0uwXb8hn9sf/rqtgzNY0gpkWmI0G+JbDvmeP8AYFAvp8/CYl7JP/rpi9O4Ua24JY4EJvqo0eC020jiKuFISABudyffQ+6RmLWHJFWU3qD5V1HW9X+GWjh34d/RUN+wdtV4Hhs+o/FOkqPRs+PfEf11X8Fymy6Ruq9y0sasL8C0xLki4uPIeQ84pBTwBBHCR8o9oNQPSzT7ELVqHZbjAtJZlMPlTS/KXVcJ4FDsKiDyJ7a3OnNEjv4vYH3W+Jxl5/qzxEbbpRv7ewValcybIaCNv9SqlxWOlzHcZKJuCOEnkUtzkqSfpQKEOteptn1AEYW3BrbYXGXCtcpogvOj/KeFIG3t3oZ1NtGbDasizBi33iL5TGWoBSOsUjfn4pINWxBFF+MDhK7XR6NmOXHItY7D5CytTNulImynQPNaQ2eLme7cgAe2ms6Rc+6Mx7dCZU63bn+IvFO4C1jbZJPs3O3fRAwnFMcxKzogY3Z4ttjqAUtLKeazt2qUeaj7Sa6twgw7jEXEnxmpLC/SbcSFA1RGc0ZDZS2wFn9WwX52G/HY/SXev36HhKFWVONW7FarJd+qtcQRkKPNIWpQ/eTWlphaLdeMgRGuUfr2f8vGpP1EV6kZTDD3q2XxV/Spm5vsVjVdXvX0v9lz8Nxm45TdkQYLag2COvfI81pPeSfHwFGfWmCxbdBsit8ZPCzHtZbQPUNqnNrtsC1RExLdEZisJ7ENp2H/ANrk6jwYtywW8QJrXWxn4ykOI4iniHLluCCK8xl9QOVI3amgr614f8Ps6TGbOp7uT/A+91WYfgT8mrKNH/ipxT5ojfw00tn9luCcG33DPZ/rH/66abCYrEHD7PCit9WwxCabbTuTwpCQANzzNLOla9oAXoQKSx9Pf8sYt/0HvrFLHT19IvFLBkk6zrvUDypTDbgbPXOI4QSN/RUN6E/9l2C/oM/tj/8AXXbGna2IAoLV/9k=";
const THEMES={
  dark:{bg:"#070C18",card:"#0D1526",cb:"#1A2840",inp:"#111F35",ib:"#1E3050",text:"#E2E8F0",muted:"#64748B",rOptOn:"#0A2010",rOptOnB:BRAND.teal,rOptOnT:BRAND.teal,rOptOff:"#111F35",rOptOffB:"#1E3050",rOptOffT:"#64748B",disabledBtn:"#334155",shadow:"0 4px 20px rgba(0,0,0,0.4)",loginBg:"#070C18",infoBox:"#0A1929",infoBorder:"#1E3A5F",infoTxt:"#93C5FD"},
  light:{bg:"#E8EDF4",card:"#FFFFFF",cb:"#B8C8DC",inp:"#F0F4F9",ib:"#8FAAC4",text:"#0D1E3D",muted:"#3A5580",rOptOn:"#D6F4F8",rOptOnB:BRAND.teal,rOptOnT:BRAND.tealD,rOptOff:"#EEF3F8",rOptOffB:"#8FAAC4",rOptOffT:"#3A5580",disabledBtn:"#7A96B4",shadow:"0 2px 12px rgba(15,30,70,0.15)",loginBg:"#DDE5F0",infoBox:"#E4EEFF",infoBorder:"#8FAAC4",infoTxt:"#0D1E3D"},
};
let _thm="light";
function getT(){return THEMES[_thm];}
function useTheme(t){
  if(t)_thm=t;
  const T=getT();
  C=T;
  crd={background:T.card,border:`1px solid ${T.cb}`,borderRadius:12,padding:"20px",marginBottom:16,boxShadow:T.shadow};
  lbl={fontSize:11,fontWeight:700,color:T.muted,marginBottom:5,display:"block",letterSpacing:0.5,textTransform:"uppercase"};
  inp={width:"100%",background:T.inp,border:`1px solid ${T.ib}`,borderRadius:8,padding:"9px 11px",color:T.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box",outline:"none"};
  sel={...inp,cursor:"pointer"};
}
let C=THEMES.light;
const RTL={fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"};
let crd={background:C.card,border:`1px solid ${C.cb}`,borderRadius:12,padding:"20px",marginBottom:16,boxShadow:C.shadow};
let lbl={fontSize:11,fontWeight:700,color:C.muted,marginBottom:5,display:"block",letterSpacing:0.5,textTransform:"uppercase"};
let inp={width:"100%",background:C.inp,border:`1px solid ${C.ib}`,borderRadius:8,padding:"9px 11px",color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box",outline:"none"};
let sel={...inp,cursor:"pointer"};
const rOpt=a=>{const T=getT();return{padding:"7px 14px",borderRadius:7,border:`1px solid ${a?T.rOptOnB:T.rOptOffB}`,background:a?T.rOptOn:T.rOptOff,color:a?T.rOptOnT:T.rOptOffT,cursor:"pointer",fontSize:12,fontWeight:a?700:400,userSelect:"none",transition:"all 0.15s"};};
const mkBtn=(bg,sm,disabled)=>{const T=getT();return{padding:sm?"5px 12px":"10px 20px",borderRadius:sm?6:8,border:"none",cursor:disabled?"not-allowed":"pointer",fontSize:sm?11:13,fontWeight:700,fontFamily:"inherit",background:disabled?T.disabledBtn:bg,color:"#fff",display:"inline-flex",alignItems:"center",gap:6,opacity:disabled?0.6:1};};
const navBtn=a=>{return{padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:a?BRAND.teal:"transparent",color:a?"#fff":"rgba(255,255,255,0.75)",transition:"all 0.15s"};};
const g2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:14};
const g3={display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14};
function FridensonLogo({height=28,inverted=false}){
  return(<img src={LOGO_URI} alt="fridenson" style={{height,display:"block",filter:inverted?"brightness(0) invert(1)":"none",maxWidth:"100%"}}/>);
}

// ══════ ERROR BOUNDARY ════════════════════
class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){console.error("Screen error:",e,info);}
  render(){
    if(this.state.err){
      const T=getT();
      return React.createElement('div',{style:{maxWidth:700,margin:"40px auto",padding:24,fontFamily:"'Segoe UI',Arial,sans-serif",direction:"rtl"}},
        React.createElement('div',{style:{padding:20,background:"#FEF2F2",border:"2px solid #EF4444",borderRadius:12,color:"#7F1D1D"}},
          React.createElement('div',{style:{fontSize:18,fontWeight:700,marginBottom:8}},"⚠️ שגיאה במסך"),
          React.createElement('div',{style:{fontSize:13,marginBottom:12}},""+this.state.err.message),
          React.createElement('button',{style:{padding:"8px 16px",background:"#EF4444",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600},onClick:()=>this.setState({err:null})},"נסה שוב")
        )
      );
    }
    return this.props.children;
  }
}

// ══════ ATOMS ════════════════════════════
function Fld({label:l,children}){
  return (<div style={{marginBottom:14}}><label style={lbl}>{l}</label>{children}</div>);
}
function Inp({value,onChange,placeholder,type="text",disabled}){
  return (<input style={{...inp,opacity:disabled?0.5:1}} type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} disabled={disabled}/>);
}
function Ta({value,onChange,placeholder}){
  return (<textarea style={{...inp,resize:"vertical",minHeight:72}} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""}/>);
}
function Rg({options,value,onChange}){
  return (<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{options.map((o,i)=>(<div key={i} style={rOpt(value===o.v)} onClick={()=>onChange(o.v)}>{o.l}</div>))}</div>);
}
function ScoSel({label:l,opts,value,onChange,max}){
  const s=opts.find(o=>o.v===value);
  const ok=value!==null&&value!==undefined;
  const barColor=s?.rf?"#EF4444":value&&max&&value/max>0.6?"#10B981":value&&max&&value/max>0.3?"#FBBF24":"#EF4444";
  return (
    <div style={{marginBottom:12}}>
      <label style={lbl}>{l}{max&&<span style={{color:"#334155",marginRight:4}}>/{max}</span>}</label>
      <select style={{...inp,cursor:'pointer',borderColor:s?.rf?"#7F1D1D":ok?BRAND.teal:getT().ib,color:s?.rf?"#FCA5A5":getT().text}} value={ok?String(value):""} onChange={e=>{const v=e.target.value;onChange(v===""?null:Number(v));}}>
        <option value="">— בחר —</option>
        {opts.map((o,i)=>(<option key={i} value={String(o.v)}>{o.l} ({o.v} נק׳)</option>))}
      </select>
      {ok&&max&&(
        <div style={{height:4,background:"#1A2840",borderRadius:2,overflow:"hidden",marginTop:3}}>
          <div style={{height:"100%",width:`${Math.round((value/max)*100)}%`,background:barColor,borderRadius:2,transition:"width 0.3s"}}/>
        </div>
      )}
    </div>
  );
}
function StatusBadge({status}){
  const s=ST[status]||ST.draft;
  return (<span style={{padding:"3px 10px",borderRadius:20,background:s.bg,color:s.c,fontSize:11,fontWeight:700,border:`1px solid ${s.c}50`}}>{s.i} {s.l}</span>);
}
function Toast({msg,ok,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[]);
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:999,padding:"12px 20px",borderRadius:10,background:ok?"#022c22":"#2d0707",border:`2px solid ${ok?"#10B981":"#EF4444"}`,color:ok?"#10B981":"#EF4444",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:8,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl",boxShadow:getT().shadow}}>
      {ok?"✅":"❌"} {msg}
    </div>
  );
}
function Divider({label:l}){
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0 12px",fontSize:10,fontWeight:700,color:"#334155",letterSpacing:2}}>
      <span>{l}</span><div style={{flex:1,height:1,background:C.cb}}/>
    </div>
  );
}
// ══════ HELPERS ══════════════════════════
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("he-IL",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const fmtAmt = v => v ? `$${Number(v).toLocaleString()}` : "—";

// ══════ WORKFLOW GUIDE ═══════════════════
function WorkflowGuide(){
  const T=getT();
  const bold = {fontWeight:800};
  const steps = [
    {
      role:"מנהל מכירות", icon:"👤", color:"#3B82F6", status:"submitted",
      title:"שלב 1 — פתיחת בקשת אשראי",
      desc:"מנהל המכירות פותח בקשה חדשה במערכת, ממלא את פרטי הלקוח ומגיש לרפרנטית.",
      items:[
        {t:"כניסה עם שם משתמש וסיסמה אישית"},
        {t:"פתיחת בקשה חדשה → מילוי שדות חובה: שם לקוח, ח.פ, ענף"},
        {t:"הזנת רווח שנתי משוער ($) ומסגרת אשראי מבוקשת ($)"},
        {t:"בחירת תנאי תשלום הובלה ותנאי תשלום מיסים בנפרד"},
        {t:"הגדרת פיצול חשיפה: אחוז הובלה / אחוז מיסים"},
        {t:"סימון: לקוח חדש / לקוח קיים — ואם קיים: מסגרת חדשה / הגדלת מסגרת"},
        {t:"סימון אם הלקוח סינרגי (קבוצתי / אסטרטגי) — משפיע על הניקוד"},
        {t:'לחיצה על "הגש לרפרנטית" → מייל אוטומטי נשלח לרפרנטית',bold:true},
      ],
    },
    {
      role:"רפרנטית אשראי", icon:"🔍", color:"#8B5CF6", status:"in_review",
      title:"שלב 2 — סקירת אשראי ו-BDI",
      desc:"הרפרנטית בוחנת את הבקשה, שולפת דוח BDI, בודקת כיסוי ביטוח כלל, וממלאת 9 קטגוריות ציון.",
      items:[
        {t:"כניסה ← לשונית 🔍 סקירת אשראי — רשימת בקשות ממתינות"},
        {t:"שליפת דוח BDI: כניסה ל-bdi.co.il → דירוג 1–10 (או Claude Code CLI אוטומטי)"},
        {t:"דירוג 9–10: בקשה נחסמת אוטומטית ⛔ — לא ניתן להעביר",bold:true},
        {t:"הזנת סכום כיסוי כלל ביטוח → ניקוד אוטומטי (30% מהציון הכולל)",bold:true},
        {t:"מילוי קטגוריות 3–9: היסטוריה, פרופיל, פיננסים, חשיפה, תנאים, סינרגיה"},
        {t:"קטגוריות 6–8 מחושבות אוטומטית מנתוני הבקשה"},
        {t:"לקוח חדש → קטגוריה 3 מקבלת ציון ניטרלי אוטומטית"},
        {t:"שמירת דוח BDI ואישור כלל לתיוק לוועדה (העתק-הדבק)"},
        {t:'שליחה לאישור: עד $200K → סמנכ"ל · מעל $200K → ועדת אשראי → מייל אוטומטי',bold:true},
      ],
    },
    {
      role:'סמנכ"ל כספים', icon:"💼", color:"#F59E0B", status:"pending_cfo",
      title:'שלב 3א — אישור סמנכ"ל (עד $200K)',
      desc:'בקשות עד $200,000 מגיעות לסמנכ"ל הכספים לאישור. הסמנכ"ל גם מנהל ישיבות ועדת אשראי.',
      items:[
        {t:'כניסה ← לשונית 💼 אישורי סמנכ"ל — רשימת ממתינות'},
        {t:"סקירת הציון (מתוך 100), דגלי סיכון, דוח BDI ואישור כלל"},
        {t:"הקלדת שם מלא = חתימה דיגיטלית + חותמת זמן אוטומטית",bold:true},
        {t:"בחירת החלטה: ✅ מאשר / 📋 מאשר בתנאים / ❌ דוחה"},
      ],
    },
    {
      role:"ועדת אשראי", icon:"⚖️", color:"#EF4444", status:"pending_committee",
      title:"שלב 3ב — ועדת אשראי (מעל $200K)",
      desc:'בקשות מעל $200,000 לדיון ועדת האשראי. הסמנכ"ל מנהל את הישיבה ומקליד הצבעות.',
      items:[
        {t:'חברי הוועדה: 💼 סמנכ"ל כספים · 🚢 מנכ"ל שילוח · 🏢 מנכ"ל פרידנזון',bold:true},
        {t:"כניסה ← לשונית ⚖️ ועדת אשראי — פתיחת הבקשה"},
        {t:"הצגת הבקשה, הציון, דוח BDI ואישור כלל לכל חברי הוועדה"},
        {t:"הקלדת הצבעת כל חבר: ✅ מאשר / 📋 בתנאים / ❌ דוחה + נימוק"},
        {t:'מנכ"ל פרידנזון — וטו כפול: דחייה = דוחה הכל; אישור = גובר על 1 דוחה',bold:true},
        {t:"אישור ברוב קולות (2/3) — תוצאה מחושבת אוטומטית",bold:true},
        {t:'הקלדת פרוטוקול ישיבה → לחיצת "סגור ותייק"'},
      ],
    },
    {
      role:"סיום תהליך", icon:"✅", color:"#10B981", status:"approved",
      title:"שלב 4 — אישור ותיעוד",
      desc:"לאחר ההחלטה, הבקשה מסומנת בסטטוס מתאים וכל ההיסטוריה שמורה.",
      items:[
        {t:"סטטוס מתעדכן אוטומטית: ✅ אושרה / 📋 בתנאים / ❌ נדחתה"},
        {t:"מנהל המכירות רואה את סטטוס הבקשה שלו בזמן אמת"},
        {t:"Audit Trail מלא: כל חתימה + שם + זמן + החלטה שמורים",bold:true},
      ],
    },
    {
      role:"רפרנטית אשראי", icon:"📄", color:"#A78BFA", status:"agreement_pending",
      title:"שלב 5 — הסכם אשראי, שליחה ותיוק",
      desc:"לאחר אישור, הרפרנטית מכינה הסכם, שולחת ללקוח/איש מכירות, ומתעדת את ההסכם החתום.",
      items:[
        {t:"כניסה ← לשונית 📄 הסכמי אשראי"},
        {t:"בחירת תבנית הסכם (סטנדרטי / עם תנאים / עם ערבות) → מילוי אוטומטי מנתוני הבקשה",bold:true},
        {t:"עריכת הנוסח לפי הצורך + הורדה כקובץ טקסט"},
        {t:"שליחה ישירה: 📧 ללקוח (לפי מייל שהוזן בבקשה) / לאיש מכירות"},
        {t:"עדכון סטטוס → ✉️ נשלח ללקוח"},
        {t:"קבלת הסכם חתום → תיוק בשדה ייעודי → עדכון סטטוס 🖊️ נחתם",bold:true},
      ],
    },
  ];

  const scoreRows=[
    ["1","דירוג BDI","30","דירוג 1–10 מאתר BDI · 1=ללא סיכון, 9–10=חסום","#EF4444"],
    ["2","ביטוח כלל","30","כיסוי ביטוח אשראי לקוחות מכלל ביטוח · 100%=30 נק׳","#F97316"],
    ["3","היסטוריית תשלומים","15","ותק לקוח + עמידה בתנאים + שיאי חוב · לקוח חדש=ניטרלי","#FBBF24"],
    ["4","פרופיל עסקי","10","ותק עסקי + ענף + מבנה משפטי — נלקח מדוח BDI","#A3E635"],
    ["5","יחסים פיננסיים","8","חוב להון + יחס שוטף + מגמת הכנסות · אם לא זמין=ניטרלי","#4ADE80"],
    ["6","סוג חשיפה","3","הובלה בלבד / הובלה+מיסים / מיסים בלבד · אוטומטי","#34D399"],
    ["7","תנאי תשלום","3","שוטף / שוטף+30/60/90/120 / אחר · אוטומטי","#38BDF8"],
    ["8","גובה האשראי","3","יחס מסגרת לרווח השנתי המשוער · אוטומטי","#93C5FD"],
    ["9","סינרגיה","3","לקוח קבוצתי / שותף אסטרטגי / פוטנציאל · מסומן בבקשה","#C4B5FD"],
  ];

  return(
    <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>

      {/* Header with logo */}
      <div style={{textAlign:"center",marginBottom:28,padding:"24px",background:T.card,borderRadius:16,border:`1px solid ${T.cb}`,boxShadow:T.shadow}}>
        <FridensonLogo height={40} inverted={false}/>
        <h1 style={{fontSize:24,fontWeight:900,color:T.text,margin:"14px 0 4px"}}>מדריך תהליך אישור אשראי</h1>
        <p style={{color:T.muted,fontSize:13,margin:0}}>פרידנזון שירותים לוגיסטיים · מדריך זרימה מלא · {new Date().getFullYear()}</p>
      </div>

      {/* Threshold banner */}
      <div style={{...crd,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"center",gap:40,flexWrap:"wrap",textAlign:"center"}}>
          {[
            {label:'סף אישור סמנכ"ל',value:"עד $200,000",c:"#F59E0B"},
            {label:"סף ועדת אשראי",value:"מעל $200,000",c:"#EF4444"},
            {label:"BDI חסום אוטומטי",value:"דירוג 9–10 ⛔",c:"#EF4444"},
            {label:"משקל BDI + כלל",value:"60% מהציון",c:BRAND.teal},
          ].map((item,i)=>(
            <div key={i}>
              <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>{item.label}</div>
              <div style={{fontSize:20,fontWeight:900,color:item.c}}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Flow Steps */}
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:0}}>
        {steps.map((step,i)=>(
          <div key={i} style={{display:"flex",gap:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginLeft:16,minWidth:52}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:step.color+"20",border:`2px solid ${step.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                {step.icon}
              </div>
              {i<steps.length-1&&<div style={{width:2,flex:1,minHeight:20,background:`linear-gradient(${step.color},${steps[i+1].color})`,margin:"4px 0"}}/>}
            </div>
            <div style={{...crd,flex:1,marginBottom:i<steps.length-1?8:0,border:`2px solid ${step.color}40`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,color:step.color,fontWeight:800,marginBottom:2}}>{step.role}</div>
                  <div style={{fontSize:17,fontWeight:900,color:T.text}}>{step.title}</div>
                  <div style={{fontSize:12,color:T.muted,marginTop:4,lineHeight:1.6,fontWeight:600}}>{step.desc}</div>
                </div>
                <div style={{padding:"4px 12px",borderRadius:20,background:step.color+"20",border:`1px solid ${step.color}`,fontSize:11,fontWeight:800,color:step.color,whiteSpace:"nowrap",marginRight:8}}>{i+1}/{steps.length}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:10}}>
                {step.items.map((item,j)=>{
                  const txt=typeof item==="string"?item:item.t;
                  const isBold=typeof item==="object"&&item.bold;
                  const isWarn=txt.startsWith("⛔")||txt.startsWith("🔴");
                  return(
                    <div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"5px 10px",borderRadius:6,background:isBold?step.color+"15":isWarn?"#FEF2F2":"transparent",border:isBold?`1px solid ${step.color}30`:"none"}}>
                      <span style={{color:isWarn?"#EF4444":step.color,fontWeight:700,flexShrink:0,marginTop:1}}>{isWarn?"⛔":"›"}</span>
                      <span style={{fontSize:13,color:isWarn?"#EF4444":T.text,fontWeight:isBold?700:600,lineHeight:1.5}}>{txt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BDI Scale */}
      <div style={{...crd,marginTop:16}}>
        <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:3,height:18,background:"#D97706",borderRadius:2}}/>📊 סולם דירוג BDI — עזר מהיר
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:6,marginBottom:12}}>
          {[1,2,3,4,5,6,7,8,9,10].map(n=>{
            const m=BDI_META[n];
            return(
              <div key={n} style={{textAlign:"center",padding:"10px 4px",borderRadius:10,background:m.color+"20",border:`2px solid ${m.color}50`}}>
                <div style={{fontSize:18,fontWeight:900,color:m.color}}>{n}</div>
                <div style={{fontSize:9,color:m.color,marginTop:3,fontWeight:700}}>{BDI_SCORE_MAP[n]}נק׳</div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:12}}>
          {[{c:"#10B981",l:"1–4: ללא סיכון"},{c:"#86EFAC",l:"5: סיכון נמוך"},{c:"#FBBF24",l:"6–7: בינוני"},{c:"#F97316",l:"8: גבוה"},{c:"#EF4444",l:"9–10: ⛔ חסום"}].map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontWeight:700}}>
              <div style={{width:12,height:12,borderRadius:3,background:item.c}}/>
              <span style={{color:T.text}}>{item.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring model */}
      <div style={crd}>
        <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:3,height:18,background:"#D97706",borderRadius:2}}/>📋 מודל הציון — 9 קטגוריות (סה"כ 105 נק׳ → מנורמל ל-100)
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:T.inp}}>
              {["#","קטגוריה","משקל מקסימלי","תיאור"].map((h,i)=>(
                <th key={i} style={{padding:"10px 12px",color:T.muted,fontWeight:700,border:`1px solid ${T.cb}`,textAlign:"right"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scoreRows.map(([num,cat,w,d,c],i)=>(
              <tr key={i} style={{background:i%2===0?T.card:T.inp}}>
                <td style={{padding:"10px 12px",border:`1px solid ${T.cb}`,fontWeight:900,color:c,textAlign:"center"}}>{num}</td>
                <td style={{padding:"10px 12px",border:`1px solid ${T.cb}`,fontWeight:800,color:T.text}}>{cat}</td>
                <td style={{padding:"10px 12px",border:`1px solid ${T.cb}`,fontWeight:900,color:c,whiteSpace:"nowrap",textAlign:"center"}}>{w} נק׳</td>
                <td style={{padding:"10px 12px",border:`1px solid ${T.cb}`,color:T.muted,fontWeight:600}}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Decision bands */}
      <div style={crd}>
        <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:3,height:18,background:"#D97706",borderRadius:2}}/>🎯 טבלת החלטה לפי ציון
        </div>
        {[
          {r:"85–100",l:"נמוך מאוד",c:"#10B981",rec:'אישור בסמכות מנהל חטיבה'},
          {r:"70–84",l:"נמוך",c:"#4ADE80",rec:"אישור — דיווח לוועדה"},
          {r:"55–69",l:"בינוני",c:"#FBBF24",rec:"ועדת אשראי מחליטה"},
          {r:"40–54",l:"גבוה",c:"#F97316",rec:"ועדה — בטחונות חובה"},
          {r:"מתחת ל-40",l:"קריטי",c:"#EF4444",rec:"המלצת סירוב"},
        ].map((row,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderRadius:10,marginBottom:6,background:row.c+"10",border:`1px solid ${row.c}40`}}>
            <div style={{width:80,fontWeight:900,fontSize:16,color:row.c,textAlign:"center"}}>{row.r}</div>
            <div style={{width:80,padding:"4px 10px",borderRadius:20,background:row.c+"25",color:row.c,fontSize:12,fontWeight:800,textAlign:"center"}}>{row.l}</div>
            <div style={{flex:1,fontSize:14,color:T.text,fontWeight:700}}>{row.rec}</div>
          </div>
        ))}
      </div>

      {/* Email setup reminder */}
      <div style={{...crd,border:`2px solid ${BRAND.teal}`,background:T.infoBox}}>
        <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:12}}>📧 הגדרת מיילים להתראות</div>
        <div style={{fontSize:13,color:T.muted,lineHeight:1.8,fontWeight:600}}>
          לצורך שליחת התראות אוטומטיות, ודא שבהגדרות המשתמש (⚙️ מנהל מערכת) הוזן <strong style={{color:T.text}}>כתובת אימייל</strong> לכל משתמש:<br/>
          • <strong style={{color:T.text}}>רפרנטית אשראי</strong> — תקבל התראה עם כל בקשה חדשה מאיש מכירות<br/>
          • <strong style={{color:T.text}}>סמנכ"ל כספים</strong> — יקבל התראה עם כל בקשה שהועברה לאישורו<br/>
          • <strong style={{color:T.text}}>מייל לקוח</strong> — מוזן בטופס הבקשה על ידי איש המכירות → לשליחת הסכם
        </div>
      </div>
    </div>
  );
}


// ══════ BDI SELECT COMPONENT ════════════
function BdiSelect({value, onChange}){
  const meta = value !== null ? BDI_META[value] : null;
  const score = value !== null ? BDI_SCORE_MAP[value] : null;
  return(
    <div style={{marginBottom:14}}>
      <label style={lbl}>דירוג BDI (סולם 1–10) <span style={{color:"#334155"}}>/ 25</span></label>

      {/* Scale visual guide */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3,marginBottom:10}}>
        {[1,2,3,4,5,6,7,8,9,10].map(n=>{
          const m=BDI_META[n];
          const active=value===n;
          return(
            <div key={n} onClick={()=>onChange(n)} style={{textAlign:"center",cursor:"pointer",padding:"6px 0",borderRadius:6,background:active?m.color:m.color+"20",border:`2px solid ${active?m.color:m.color+"40"}`,transition:"all 0.15s"}}>
              <div style={{fontSize:13,fontWeight:800,color:active?"#fff":m.color}}>{n}</div>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:9,color:C.muted}}>
        <span style={{color:"#10B981"}}>← ללא סיכון 1–4</span>
        <span style={{color:"#FBBF24"}}>6–7 בינוני</span>
        <span style={{color:"#EF4444"}}>8–10 גבוה →</span>
      </div>

      {/* Selected value display */}
      {value !== null && meta && (
        <div style={{padding:"10px 14px",borderRadius:10,background:meta.bg,border:`2px solid ${meta.color}60`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:meta.color}}>דירוג {value} — {meta.cat}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>
              ציון: <strong style={{color:meta.color}}>{score}</strong> / 25 נקודות
            </div>
          </div>
          {meta.blocked ? (
            <div style={{padding:"8px 16px",background:"#EF4444",borderRadius:8,fontSize:13,fontWeight:800,color:"#fff"}}>
              ⛔ אסור לאשראי
            </div>
          ):(
            <div style={{padding:"8px 16px",background:meta.color+"25",border:`1px solid ${meta.color}50`,borderRadius:8,fontSize:13,fontWeight:700,color:meta.color}}>
              {score} נק׳
            </div>
          )}
        </div>
      )}

      {/* BDI block warning */}
      {meta?.blocked && (
        <div style={{marginTop:10,padding:"12px 16px",background:"#2d0707",border:"2px solid #EF4444",borderRadius:10,fontSize:13,fontWeight:700,color:"#EF4444",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:24}}>⛔</span>
          <div>
            <div>דירוג BDI {value} — מניעת אשראי מוחלטת</div>
            <div style={{fontSize:11,fontWeight:400,color:"#FCA5A5",marginTop:3}}>לפי מדיניות החברה, דירוגים 9 ו-10 לא יכולים לקבל אשראי. הבקשה נחסמת אוטומטית.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════ LOGIN SCREEN ═════════════════════
function LoginScreen({settings,onLogin,theme,onToggleTheme}){
  useTheme(theme);const T=getT();const isLight=theme==="light";
  const [username,setUsername]=useState("");const [password,setPassword]=useState("");
  const [error,setError]=useState("");const [showPass,setShowPass]=useState(false);
  const [showGuide,setShowGuide]=useState(false);
  const allUsers=settings.users||[];const hasAnyUsers=allUsers.length>0;
  function doLogin(){
    setError("");
    if(!username.trim()||!password.trim()){setError("מלא שם משתמש וסיסמה");return;}
    if(username==="admin"&&password==="admin123"&&!hasAnyUsers){onLogin({name:"מנהל מערכת",role:"referent",username:"admin",canSeeAll:true,isAdmin:true});return;}
    const user=allUsers.find(u=>u.username===username&&u.password===password);
    if(!user){setError("שם משתמש או סיסמה שגויים");return;}
    onLogin({...user,canSeeAll:user.role!=="sales",isAdmin:user.role==="referent"||user.role==="cfo"});
  }

  // ── GUIDE VIEW (no login required) ────────────────────
  if(showGuide){
    return(
      <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
        {/* Mini top bar */}
        <div style={{background:`linear-gradient(135deg,${BRAND.navy},${BRAND.navyL})`,padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <FridensonLogo height={26} inverted={true}/>
            <div style={{width:1,height:32,background:"rgba(255,255,255,0.2)"}}/>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",fontWeight:700,letterSpacing:2,lineHeight:1.4}}>CREDIT<br/>MANAGEMENT</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onToggleTheme} style={{padding:"6px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.1)",cursor:"pointer",color:"rgba(255,255,255,0.85)",fontSize:13}}>
              {isLight?"🌙":"☀️"}
            </button>
            <button onClick={()=>setShowGuide(false)} style={{padding:"7px 18px",borderRadius:20,border:"1px solid rgba(255,255,255,0.3)",background:BRAND.teal+"30",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
              ← כניסה למערכת
            </button>
          </div>
        </div>
        {/* Render the guide */}
        <WorkflowGuide isMobile={false}/>
      </div>
    );
  }

  // ── LOGIN VIEW ─────────────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:T.loginBg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl",padding:"0 20px",transition:"background 0.3s"}}>
      {/* Top bar controls */}
      <div style={{position:"fixed",top:16,left:16,display:"flex",gap:8}}>
        <button onClick={onToggleTheme} style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${T.cb}`,background:T.card,cursor:"pointer",fontSize:13,color:T.text,fontFamily:"inherit",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:6}}>
          {isLight?"🌙 מצב כהה":"☀️ מצב בהיר"}
        </button>
        <button onClick={()=>setShowGuide(true)} style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${BRAND.teal}`,background:T.card,cursor:"pointer",fontSize:13,color:BRAND.teal,fontFamily:"inherit",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:6,fontWeight:700}}>
          🗺️ מדריך תהליך
        </button>
      </div>
      <div style={{width:"100%",maxWidth:430}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><FridensonLogo height={38} inverted={false}/></div>
          <div style={{fontSize:11,color:T.muted,letterSpacing:2,fontWeight:600}}>CREDIT MANAGEMENT SYSTEM</div>
          <div style={{width:50,height:3,background:`linear-gradient(90deg,${BRAND.navy},${BRAND.teal})`,borderRadius:2,margin:"12px auto 0"}}/>
        </div>
        <div style={{background:T.card,border:`1px solid ${T.cb}`,borderRadius:18,padding:32,boxShadow:T.shadow}}>
          <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:22,textAlign:"center"}}>כניסה למערכת</div>
          {!hasAnyUsers&&<div style={{padding:"10px 14px",background:isLight?"#FEF9E7":"#1C1806",border:`1px solid ${isLight?"#F59E0B":"#7F6D00"}`,borderRadius:8,marginBottom:16,fontSize:12,color:isLight?"#92400E":"#FDE68A",lineHeight:1.7}}>⚠ כניסה ראשונית — <strong>admin / admin123</strong></div>}
          <div style={{marginBottom:14}}>
            <label style={lbl}>שם משתמש</label>
            <input style={{...inp,fontSize:14,padding:"12px 14px"}} value={username} onChange={e=>setUsername(e.target.value)} placeholder="user.name" onKeyDown={e=>e.key==="Enter"&&doLogin()} autoComplete="username"/>
          </div>
          <div style={{marginBottom:8}}>
            <label style={lbl}>סיסמה</label>
            <div style={{position:"relative"}}>
              <input style={{...inp,fontSize:14,padding:"12px 42px 12px 14px"}} type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&doLogin()} autoComplete="current-password"/>
              <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",cursor:"pointer",color:T.muted,fontSize:15,userSelect:"none"}} onClick={()=>setShowPass(p=>!p)}>{showPass?"👁":"👁‍🗨"}</span>
            </div>
          </div>
          {error&&<div style={{color:"#EF4444",fontSize:12,padding:"8px 12px",background:isLight?"#FEF2F2":"#2d0707",border:`1px solid ${isLight?"#FECACA":"#7F1D1D"}`,borderRadius:7,marginTop:8,textAlign:"center"}}>{error}</div>}
          <button style={{width:"100%",padding:"13px",marginTop:18,borderRadius:10,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit",background:`linear-gradient(135deg,${BRAND.navy},${BRAND.navyL})`,color:"#fff",boxShadow:`0 6px 18px ${BRAND.navy}35`}} onClick={doLogin}>כנס למערכת</button>
        </div>
        <div style={{marginTop:18,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{icon:"👤",l:"מנהל מכירות",c:"#3B82F6",d:"בקשות שלי"},{icon:"🔍",l:"רפרנטית",c:"#8B5CF6",d:"סקירה + BDI"},{icon:"💼",l:'סמנכ"ל',c:BRAND.teal,d:"אישורים + ועדה"},{icon:"⚙️",l:"מנהל מערכת",c:BRAND.navy,d:"הגדרות"}].map((r,i)=>(
            <div key={i} style={{padding:"8px 10px",background:T.card,border:`1px solid ${T.cb}`,borderRadius:9,display:"flex",gap:8,alignItems:"center",boxShadow:T.shadow}}>
              <span style={{fontSize:16}}>{r.icon}</span>
              <div><div style={{fontSize:11,fontWeight:700,color:r.c}}>{r.l}</div><div style={{fontSize:10,color:T.muted}}>{r.d}</div></div>
            </div>
          ))}
        </div>
        {/* Guide link at bottom */}
        <div style={{marginTop:16,textAlign:"center"}}>
          <button onClick={()=>setShowGuide(true)} style={{background:"none",border:"none",cursor:"pointer",color:BRAND.teal,fontSize:13,fontWeight:700,fontFamily:"inherit",textDecoration:"underline",textUnderlineOffset:3}}>
            🗺️ צפה במדריך תהליך האישור →
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({user,onLogout,activeView,setView,tabs,isMobile,theme,onToggleTheme,onToggleMobile,forceMobile,pendingCounts}){
  useTheme(theme);const T=getT();const isLight=theme==="light";
  const roleLabels={sales:"מנהל מכירות",referent:"רפרנטית",cfo:'סמנכ"ל כספים'};
  if(isMobile){return(
    <>
      <div style={{background:T.headerBg||`linear-gradient(135deg,${BRAND.navy},${BRAND.navyL})`,borderBottom:`2px solid ${BRAND.teal}30`,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 10px rgba(0,0,0,0.3)"}}>
        <div style={{padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
          <FridensonLogo height={28} inverted={true}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:600}}>{user.name}</span>
            <button style={{background:"transparent",border:"none",cursor:"pointer",color:BRAND.teal,fontSize:16,padding:"4px"}} onClick={onToggleMobile} title="עבור לתצוגת מחשב">🖥️</button>
            <button style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",fontSize:16,padding:"4px"}} onClick={onToggleTheme}>{isLight?"🌙":"☀️"}</button>
            <button style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:19,padding:"4px"}} onClick={onLogout}>⎋</button>
          </div>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,right:0,left:0,zIndex:200,background:isLight?"#FFFFFF":T.card,borderTop:`2px solid ${BRAND.teal}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom)",boxShadow:isLight?"0 -4px 16px rgba(27,46,107,0.1)":"0 -4px 16px rgba(0,0,0,0.3)"}}>
        {tabs.map(t=>{const a=activeView===t.key;const icon=t.label.split(" ")[0];const lab=t.label.split(" ").slice(1).join(" ");return(<button key={t.key} onClick={()=>setView(t.key)} style={{flex:1,background:"transparent",border:"none",cursor:"pointer",padding:"8px 2px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:19}}>{icon}</span><span style={{fontSize:9,fontWeight:700,color:a?BRAND.teal:T.muted}}>{lab}</span>{a&&<div style={{width:24,height:2,background:BRAND.teal,borderRadius:1,marginTop:2}}/>}</button>);})}
      </div>
    </>
  );}
  return(
    <div style={{background:T.headerBg||`linear-gradient(135deg,${BRAND.navy},${BRAND.navyL})`,borderBottom:`2px solid ${BRAND.teal}30`,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.25)"}}>
      <div style={{maxWidth:1400,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <FridensonLogo height={36} inverted={true}/>
          <div style={{width:1,height:38,background:"rgba(255,255,255,0.25)"}}/>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.65)",fontWeight:700,letterSpacing:2.5,lineHeight:1.5,textTransform:"uppercase"}}>Credit<br/>Management</div>
        </div>
        <nav style={{display:"flex",alignItems:"center",gap:3}}>
          {tabs.map(t=>{
            const a=activeView===t.key;
            const badgeMap={referent:pendingCounts&&pendingCounts.referent,cfo:pendingCounts&&pendingCounts.cfo,committee:pendingCounts&&pendingCounts.committee,agreements:pendingCounts&&pendingCounts.agreements};
            const badge=badgeMap[t.key]||0;
            return(<button key={t.key} onClick={()=>setView(t.key)} style={{padding:"8px 16px",borderRadius:8,border:a?`1px solid ${BRAND.teal}60`:"1px solid transparent",cursor:"pointer",fontSize:12,fontWeight:a?700:500,fontFamily:"inherit",background:a?BRAND.teal+"30":"transparent",color:a?"#fff":"rgba(255,255,255,0.75)",transition:"all 0.15s",position:"relative"}}>
              {t.label}
              {badge>0&&<span style={{position:"absolute",top:2,right:2,minWidth:16,height:16,borderRadius:8,background:"#EF4444",color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{badge}</span>}
            </button>);
          })}
        </nav>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{padding:"5px 14px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:20,fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.9)"}}>{user.name} · {roleLabels[user.role]||user.role}</div>
          <button onClick={onToggleTheme} style={{padding:"7px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.25)",cursor:"pointer",fontSize:14,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.85)"}}>{isLight?"🌙":"☀️"}</button>
          <button title={forceMobile?"עבור לתצוגת מחשב":"עבור לתצוגת סלולר"} onClick={onToggleMobile} style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${forceMobile?"rgba(0,180,200,0.6)":"rgba(255,255,255,0.25)"}`,cursor:"pointer",fontSize:14,background:forceMobile?"rgba(0,180,200,0.2)":"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.85)"}}>{forceMobile?"🖥️":"📱"}</button>
          <button style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.8)"}} onClick={onLogout}>יציאה</button>
        </div>
      </div>
    </div>
  );
}

// ══════ BDI SECTION (credentials + Claude Code + manual) ══
function BDISection({customerName, hp, fin, sf}){
  const [showCLI, setShowCLI] = useState(false);
  const [bdiCreds, setBdiCreds] = useState({user:"", pass:"", idNum:""});
  const [showPass, setShowPass] = useState(false);

  // Load saved BDI credentials from localStorage
  useEffect(()=>{
    try{
      const saved = localStorage.getItem("bdi_creds");
      if(saved) setBdiCreds(JSON.parse(saved));
    }catch{}
  },[]);

  function saveCreds(creds){
    setBdiCreds(creds);
    try{ localStorage.setItem("bdi_creds", JSON.stringify(creds)); }catch{}
  }

  const cliPrompt = [
    `כנס לאתר bdi.co.il עם הפרטים הבאים:`,
    `שם משתמש: "${bdiCreds.user||"[שם משתמש]"}"`,
    `סיסמה: "${bdiCreds.pass||"[סיסמה]"}"`,
    bdiCreds.idNum ? `תעודת זהות: "${bdiCreds.idNum}"` : "",
    ``,
    `חפש את החברה: ${customerName||"[שם חברה]"} ${hp?"ח.פ "+hp:""}`,
    `שלוף את הדוח המלא והחזר JSON:`,
    `{ "rating": [1-10], "foundedYear": "...", "industry": "...", "legalForm": "...", "employees": "...", "report": "[תוכן הדוח המלא]" }`,
  ].filter(Boolean).join("\n");

  return(
    <div style={{...crd, border:`1px solid ${C.cb}`}}>
      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>📊 דוח BDI — שליפה ועיון</div>
        <div style={{fontSize:11,color:C.muted}}>{customerName||"—"} {hp?`· ${hp}`:""}</div>
      </div>

      {/* Two paths: Claude Code CLI or Manual */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{padding:14,background:"#022c22",border:"1px solid #10B98150",borderRadius:10,cursor:"pointer"}} onClick={()=>setShowCLI(p=>!p)}>
          <div style={{fontSize:13,fontWeight:700,color:"#10B981",marginBottom:4}}>🤖 Claude Code CLI</div>
          <div style={{fontSize:11,color:"#A7F3D0",lineHeight:1.6}}>שליפה אוטומטית מאתר BDI עם שם משתמש וסיסמה</div>
          <div style={{fontSize:10,color:"#10B981",marginTop:6}}>{showCLI?"▲ סגור":"▼ הצג הוראות"}</div>
        </div>
        <div style={{padding:14,background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:10}}>
          <div style={{fontSize:13,fontWeight:700,color:"#93C5FD",marginBottom:4}}>✍ הזנה ידנית</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>כנס ל-bdi.co.il בטאב נפרד, שלוף ידנית והזן את הדירוג למטה</div>
        </div>
      </div>

      {/* Claude Code CLI instructions */}
      {showCLI && (
        <div style={{marginBottom:16,padding:14,background:C.bg,border:"1px solid #10B98130",borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:700,color:"#10B981",marginBottom:12}}>הגדרת פרטי כניסה ל-BDI (נשמרים מקומית)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <Fld label="שם משתמש BDI">
              <Inp value={bdiCreds.user} onChange={v=>saveCreds({...bdiCreds,user:v})} placeholder="user@company.com"/>
            </Fld>
            <Fld label="סיסמה BDI">
              <div style={{position:"relative"}}>
                <input style={{...inp,paddingLeft:34}} type={showPass?"text":"password"} value={bdiCreds.pass} onChange={e=>saveCreds({...bdiCreds,pass:e.target.value})} placeholder="••••••••"/>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",cursor:"pointer",color:C.muted,fontSize:13}} onClick={()=>setShowPass(p=>!p)}>{showPass?"👁":"👁‍🗨"}</span>
              </div>
            </Fld>
            <Fld label="תעודת זהות BDI">
              <Inp value={bdiCreds.idNum||""} onChange={v=>saveCreds({...bdiCreds,idNum:v})} placeholder="000000000"/>
            </Fld>
          </div>
          <div style={{fontSize:12,fontWeight:700,color:"#10B981",marginBottom:8}}>הפקודה לביצוע ב-Claude Code CLI:</div>
          <div style={{position:"relative"}}>
            <div style={{background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,padding:"10px 12px",fontFamily:"monospace",fontSize:11,color:"#A7F3D0",lineHeight:1.8,whiteSpace:"pre-wrap",userSelect:"all"}}>
              {cliPrompt}
            </div>
            <button style={{...mkBtn("#334155",true),position:"absolute",top:8,left:8}} onClick={()=>navigator.clipboard?.writeText(cliPrompt)}>📋 העתק</button>
          </div>
          <div style={{marginTop:10,fontSize:11,color:C.muted,lineHeight:1.6}}>
            1. פתח Terminal על מחשב העבודה<br/>
            2. הרץ: <code style={{color:"#10B981"}}>claude</code><br/>
            3. הדבק את הפקודה למעלה<br/>
            4. העתק את תוצאת JSON לשדה "תוכן דוח BDI" למטה
          </div>
        </div>
      )}

      {/* Date + Manual rating entry */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <Fld label="תאריך הפקת דוח BDI"><Inp value={fin.bdiDate||""} onChange={sf("bdiDate")} type="date"/></Fld>
        <Fld label="קישור לדוח (אופציונלי)"><Inp value={fin.bdiUrl||""} onChange={sf("bdiUrl")} placeholder="https://bdi.co.il/..."/></Fld>
      </div>
    </div>
  );
}


// ══════ SCORE MINI PANEL ═════════════════
function ScorePanel({score,flags,rec}){
  const cats=[
    {l:"BDI",s:score.c1,m:30},
    {l:"כלל",s:score.c2,m:30},
    {l:"היסטוריה",s:score.c3,m:25},
    {l:"פרופיל",s:score.c4,m:15},
    {l:"פיננסי",s:score.c5,m:10},
    {l:"חשיפה",s:score.c6,m:5},
    {l:"תנאים",s:score.c7,m:15},
    {l:"סכום",s:score.c8,m:5},
  ];
  return(
    <div style={{background:C.bg,border:`1px solid ${C.cb}`,borderRadius:14,padding:18,position:"sticky",top:70}}>
      <div style={{textAlign:"center",padding:"12px 0 16px",borderBottom:`1px solid ${C.cb}`,marginBottom:12}}>
        <div style={{fontSize:9,letterSpacing:2,color:C.muted,marginBottom:5}}>CREDIT SCORE</div>
        <div style={{fontSize:52,fontWeight:900,lineHeight:1,color:rec.c}}>{score.norm}</div>
        <div style={{fontSize:11,color:C.muted,margin:"2px 0 8px"}}>/100</div>
        <div style={{display:"inline-block",padding:"4px 12px",background:rec.c+"25",border:`1px solid ${rec.c}50`,borderRadius:20,fontSize:12,fontWeight:700,color:rec.c}}>{rec.l}</div>
      </div>
      <div style={{marginBottom:10}}>
        {cats.map((c,i)=>{const r=c.m>0?c.s/c.m:0;const bc=r>0.6?"#10B981":r>0.3?"#FBBF24":"#EF4444";return(<div key={i} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:2}}><span>{c.l}</span><span style={{fontWeight:700,color:C.text}}>{c.s}/{c.m}</span></div><div style={{height:4,background:"#1A2840",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round(r*100)}%`,background:bc,borderRadius:2,transition:"width 0.3s"}}/></div></div>);})}
      </div>
      <div style={{padding:"8px 0",borderTop:`1px solid ${C.cb}`,borderBottom:`1px solid ${C.cb}`,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:2}}><span>גולמי</span><span style={{fontWeight:700,color:C.text}}>{score.raw}/120</span></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800}}><span style={{color:C.muted}}>מנורמל</span><span style={{color:rec.c}}>{score.norm}/100</span></div>
      </div>
      <div style={{background:rec.bg,border:`1px solid ${rec.c}40`,borderRadius:8,padding:"8px 10px",marginBottom:10}}><div style={{fontSize:10,color:C.muted,marginBottom:2}}>המלצה</div><div style={{fontSize:12,fontWeight:700,color:rec.c}}>{rec.r}</div></div>
      {flags.length>0?(<div><div style={{fontSize:10,color:"#EF4444",fontWeight:700,marginBottom:5}}>⚠ דגלים ({flags.length})</div>{flags.map((f,i)=><div key={i} style={{color:"#FCA5A5",fontSize:11,marginBottom:4,padding:"4px 8px",background:"#1f0505",borderRadius:5}}>🚩 {f}</div>)}</div>):<div style={{fontSize:11,color:"#10B981",textAlign:"center",padding:7,background:"#022c22",borderRadius:8}}>✓ אין דגלים</div>}
    </div>
  );
}

// ══════ SALES VIEW ════════════════════════
const EMPTY_REQ = {sales:{customerName:"",hp:"",industry:"",foundedYear:"",contactName:"",contactEmail:"",contactInfo:"",isExisting:"",existingSince:"",frameType:"new",salesPerson:"",annualVolume:"",serviceType:"",transportMode:"",requestedAmount:"",existingFrame:"",paymentTermsFreight:"",paymentTermsTax:"",freightPct:"",taxPct:"",isSynergy:"no",synergyDetails:"",specialCircumstances:"",businessImpact:""},status:"draft",priority:"normal"};

function SalesView({settings, currentUser, isMobile}){
  const RG = isMobile ? {display:"flex",flexDirection:"column",gap:10} : g2;
  const [mode,setMode]=useState("list"); // list | form
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [current,setCurrent]=useState(null);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);

  const refresh=useCallback(async()=>{setLoading(true);setRequests(await dbLoadIdx());setLoading(false);},[]);
  useEffect(()=>{refresh();},[]);

  function newReq(){setCurrent(JSON.parse(JSON.stringify(EMPTY_REQ)));setMode("form");}
  async function loadReq(id){const r=await dbLoadReq(id);if(r){setCurrent(r);setMode("form");}}
  function setSales(fn){setCurrent(p=>({...p,sales:fn(p.sales)}))}

  async function save(submit){
    if(!current.sales.customerName){setToast({m:"חובה להזין שם לקוח",ok:false});return;}
    setSaving(true);
    try{
      const status=submit?"submitted":current.status||"draft";
      await dbSaveReq({...current,status});
      setToast({m:submit?"בקשה הוגשה לרפרנטית ✅":"נשמרה כטיוטה",ok:true});
      await refresh();
      if(submit)setMode("list");
    }catch{setToast({m:"שגיאה בשמירה",ok:false});}
    setSaving(false);
  }

  const myReqs = requests.filter(r => r.salesPerson === currentUser.name || !currentUser.name);
  const reps=settings.salesReps||[];

  if(mode==="form"&&current){
    const s=current.sales;
    const set=k=>v=>setSales(p=>({...p,[k]:v}));
    const canSubmit=current.status==="draft"||!current.status;
    return(
      <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>טופס בקשת אשראי חדשה</h1>
            <p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>מלא את כל הפרטים ולחץ "הגש לרפרנטית"</p>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button style={mkBtn("#334155",false)} onClick={()=>{refresh();setMode("list");}}>← חזרה</button>
            <button style={mkBtn("#475569",false,saving)} onClick={()=>save(false)} disabled={saving}>💾 שמור טיוטה</button>
            {canSubmit&&<button style={mkBtn("#8B5CF6",false,saving)} onClick={()=>save(true)} disabled={saving}>📤 הגש לרפרנטית</button>}
          </div>
        </div>
        {current.status&&current.status!=="draft"&&<div style={{marginBottom:16,padding:"10px 14px",background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,fontSize:12,color:"#93C5FD"}}>📌 הבקשה במצב: <StatusBadge status={current.status}/> — לא ניתן לערוך לאחר הגשה</div>}
        <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>פרטי הלקוח</div>
          <div style={g2}>
            <Fld label="שם לקוח *"><Inp value={s.customerName} onChange={set("customerName")} placeholder="שם מלא" disabled={!canSubmit}/></Fld>
            <Fld label="ח.פ / ע.מ"><Inp value={s.hp} onChange={set("hp")} placeholder="000000000" disabled={!canSubmit}/></Fld>
            <Fld label="ענף פעילות"><select style={{...sel,opacity:canSubmit?1:0.5}} value={s.industry||""} onChange={e=>set("industry")(e.target.value)} disabled={!canSubmit}>{INDUSTRIES.map((ind,i)=><option key={i} value={i===0?"":ind}>{ind}</option>)}</select></Fld>
            <Fld label="שנת הקמה"><Inp value={s.foundedYear} onChange={set("foundedYear")} placeholder="2010" type="number" disabled={!canSubmit}/></Fld>
            <Fld label="איש קשר פיננסי"><Inp value={s.contactName} onChange={set("contactName")} placeholder="שם + טלפון" disabled={!canSubmit}/></Fld>
            <Fld label="מייל לקוח (לשליחת הסכם)"><Inp value={s.contactEmail} onChange={set("contactEmail")} placeholder="client@company.com" type="email" disabled={!canSubmit}/></Fld>
          </div>
        </div>
        <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>פרטי הקשר העסקי</div>
          <Fld label="סטטוס לקוח"><Rg options={[{l:"לקוח קיים",v:"existing"},{l:"לקוח חדש",v:"new"}]} value={s.isExisting} onChange={set("isExisting")}/></Fld>
          {s.isExisting==="existing"&&<Fld label="סוג בקשה"><Rg options={[{l:"מסגרת חדשה",v:"new"},{l:"הגדלת מסגרת קיימת",v:"increase"}]} value={s.frameType} onChange={set("frameType")}/></Fld>}
          {s.isExisting==="existing"&&s.frameType==="increase"&&<Fld label="מסגרת קיימת ($)"><Inp value={s.existingFrame} onChange={set("existingFrame")} placeholder="50000" type="number" disabled={!canSubmit}/></Fld>}
          <div style={g2}>
            {s.isExisting==="existing"&&<Fld label="לקוח מאז"><Inp value={s.existingSince} onChange={set("existingSince")} placeholder="2018" type="number" disabled={!canSubmit}/></Fld>}
            <Fld label="מנהל הלקוח / איש מכירות">
              {reps.length>0?(
                <select style={{...sel,opacity:canSubmit?1:0.5}} value={s.salesPerson||""} onChange={e=>set("salesPerson")(e.target.value)} disabled={!canSubmit}>
                  <option value="">-- בחר --</option>
                  {reps.map((r,i)=><option key={i} value={r.name}>{r.name}{r.role?` — ${r.role}`:""}</option>)}
                </select>
              ):<Inp value={s.salesPerson} onChange={set("salesPerson")} placeholder="שם מנהל המכירות" disabled={!canSubmit}/>}
            </Fld>
            <Fld label="רווח שנתי משוער ($) *">
              <Inp value={s.annualVolume} onChange={set("annualVolume")} placeholder="2000000" type="number" disabled={!canSubmit}/>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>💡 רווח גולמי משוער מהלקוח — לא מחזור. משמש לניקוד יחס האשראי.</div>
            </Fld>
            <Fld label="סוג שירות"><Rg options={["יבוא","יצוא","שניהם"].map(l=>({l,v:l}))} value={s.serviceType} onChange={set("serviceType")}/></Fld>
            <Fld label="מסלול הובלה"><Rg options={["ימי","אווירי","משולב"].map(l=>({l,v:l}))} value={s.transportMode} onChange={set("transportMode")}/></Fld>
          </div>
        </div>
        <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>פרטי הבקשה</div>
          <div style={g2}>
            <Fld label="סכום מסגרת מבוקש ($) *"><Inp value={s.requestedAmount} onChange={set("requestedAmount")} placeholder="100000" type="number" disabled={!canSubmit}/></Fld>
            <Fld label="תנאי תשלום הובלה (שילוח) *"><Rg options={["שוטף","שוטף+30","שוטף+60","שוטף+90","שוטף+120","אחר"].map(l=>({l,v:l}))} value={s.paymentTermsFreight} onChange={set("paymentTermsFreight")}/></Fld>
            <Fld label="תנאי תשלום מיסים *"><Rg options={["שוטף","שוטף+30","שוטף+60","שוטף+90","שוטף+120","אחר"].map(l=>({l,v:l}))} value={s.paymentTermsTax} onChange={set("paymentTermsTax")}/></Fld>
          </div>
          <Divider label="פיצול חשיפה"/>
          <div style={g2}>
            <Fld label="רכיב הובלה (%)"><Inp value={s.freightPct} onChange={set("freightPct")} placeholder="70" type="number" disabled={!canSubmit}/></Fld>
            <Fld label="רכיב מיסים (%)"><Inp value={s.taxPct} onChange={set("taxPct")} placeholder="30" type="number" disabled={!canSubmit}/></Fld>
          </div>
        </div>
        <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>הערות מנהל מכירות</div>
          <Fld label="נסיבות מיוחדות / פוטנציאל עסקי"><Ta value={s.specialCircumstances} onChange={set("specialCircumstances")} placeholder="למה חשוב ללקוח הזה? מה הפוטנציאל?"/></Fld>
          <Fld label="השפעה עסקית אם לא נאשר"><Ta value={s.businessImpact} onChange={set("businessImpact")} placeholder="מה יקרה אם הבקשה תידחה?"/></Fld>
          <Fld label="לקוח סינרגי?">
            <Rg options={[{l:"לא",v:"no"},{l:"כן — לקוח קבוצתי / חברת בת / שותף אסטרטגי",v:"yes"},{l:"כן — לקוח עם פוטנציאל רב לחברה",v:"potential"}]} value={s.isSynergy} onChange={set("isSynergy")}/>
            {s.isSynergy!=="no"&&<Ta value={s.synergyDetails} onChange={set("synergyDetails")} placeholder="פרט: מהו הקשר הסינרגי / הפוטנציאל..."/>}
          </Fld>
        </div>
        {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
      </div>
    );
  }

  return(
    <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>הבקשות שלי</h1><p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>ניהול בקשות אשראי — לחץ על בקשה לעריכה</p></div>
        <button style={mkBtn("#8B5CF6")} onClick={newReq}>+ בקשת אשראי חדשה</button>
      </div>
      {loading?<div style={{textAlign:"center",padding:40,color:C.muted}}>⏳ טוען...</div>:myReqs.length===0?(
        <div style={{...crd,textAlign:"center",padding:60}}><div style={{fontSize:48,marginBottom:16}}>📋</div><div style={{color:C.muted,fontSize:15,marginBottom:20}}>אין בקשות עדיין</div><button style={mkBtn("#8B5CF6")} onClick={newReq}>צור בקשה ראשונה</button></div>
      ):(
        <div style={crd}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:C.inp}}>{["לקוח","ח.פ","מסגרת","תנאים","סטטוס","עדיפות","תאריך","פעולה"].map((h,i)=><th key={i} style={{padding:"10px 12px",color:C.muted,fontWeight:600,border:`1px solid ${C.cb}`,textAlign:"right"}}>{h}</th>)}</tr></thead>
            <tbody>
              {myReqs.map((r,i)=>(
                <tr key={r.id} style={{background:i%2===0?C.card:"#0A1220"}}>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`,fontWeight:700,color:C.text}}>{r.customerName}</td>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`,color:C.muted,fontSize:12}}>{r.hp||"—"}</td>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`,color:"#93C5FD",fontWeight:600}}>{fmtAmt(r.amount)}</td>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`,color:C.text}}>{r.paymentTerms||"—"}</td>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`}}><StatusBadge status={r.status}/></td>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`,color:C.muted}}>{r.priority||"—"}</td>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`,color:C.muted,fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(r.updatedAt)}</td>
                  <td style={{padding:"10px 12px",border:`1px solid ${C.cb}`}}><button style={mkBtn("#1D4ED8",true)} onClick={()=>loadReq(r.id)}>📂 פתח</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ══════ REFERENT VIEW ════════════════════
const EMPTY_FIN={bdi:null,klal:null,hSen:null,hTime:null,hDebt:null,bSen:null,bSec:null,bStr:null,fDebt:null,fCurr:null,fRev:null,exp:null,terms:null,ratio:null,synergy:null,finNotes:"",finRec:null,klarApproved:"",bdiRating:"",bdiDate:""};

function ReferentView({isMobile}){
  const RG = isMobile ? {display:"flex",flexDirection:"column",gap:10} : g2;
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [current,setCurrent]=useState(null);
  const [fin,setFin]=useState({...EMPTY_FIN});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);

  const refresh=useCallback(async()=>{setLoading(true);setRequests(await dbLoadIdx());setLoading(false);},[]);
  useEffect(()=>{refresh();},[]);

  async function open(id){
    const r=await dbLoadReq(id);
    if(!r)return;
    setCurrent(r);
    const existingFin = r.finance||{...EMPTY_FIN};
    // Auto-populate categories 6-8 from sales request
    const s = r.sales||{};
    const autoFin = {...existingFin};
    // Cat 6: exposure type from freight/tax split
    if(existingFin.exp===null){
      const taxPct = Number(s.taxPct)||0;
      if(taxPct===0) autoFin.exp=5;        // freight only
      else if(taxPct<=30) autoFin.exp=3;   // freight + tax <=30%
      else if(taxPct<=99) autoFin.exp=1;   // freight + tax >30%
      else autoFin.exp=0;                  // tax only
    }
    // Cat 7: payment terms from sales
    if(existingFin.terms===null && (s.paymentTermsFreight||s.paymentTerms)){
      const termMap={"שוטף":3,"שוטף+30":3,"שוטף+60":2,"שוטף+90":1,"שוטף+120":0,"אחר":1};
      const t = s.paymentTermsFreight||s.paymentTerms;
      autoFin.terms = termMap[t]!==undefined ? termMap[t] : null;
    }
    // Cat 8: credit ratio — freight company margin adjustment
    // We compare credit vs annual freight volume (not company margin)
    // Cat synergy: from isSynergy field
    if(existingFin.synergy===null && s.isSynergy){
      autoFin.synergy = s.isSynergy==="yes"?3:s.isSynergy==="potential"?1:0;
    }
    if(existingFin.ratio===null && s.requestedAmount && s.annualVolume){
      const credit=Number(s.requestedAmount), vol=Number(s.annualVolume);
      if(vol>0){
        const pct=(credit/vol)*100;
        if(pct<=8) autoFin.ratio=5;        // up to 8% of freight volume
        else if(pct<=20) autoFin.ratio=3;  // 8-20%
        else if(pct<=40) autoFin.ratio=1;  // 20-40%
        else autoFin.ratio=0;              // >40% of freight volume ⚠
      }
    }
    setFin(autoFin);
    await dbSaveReq({...r,status:"in_review"});
    await refresh();
  }

  const score=useMemo(()=>calcScore(fin),[fin]);
  const flags=useMemo(()=>getFlags(fin),[fin]);
  const rec=useMemo(()=>getRec(score.norm),[score.norm]);

  const bdiBlocked = fin.bdi !== null && BDI_META[fin.bdi]?.blocked;
  const finComplete=Object.entries(fin).filter(([k])=>!["finNotes","finRec","klarApproved","bdiRating","bdiDate","bdiReport","klarReport","klarReportDate","klarRefNum"].includes(k)&&fin[k]!==null).length>=8;
  const bdiEntered=fin.bdi!==null;
  const klarEntered=fin.klal!==null;
  const readyToSend=finComplete&&bdiEntered&&klarEntered&&!bdiBlocked;

  async function save(toApproval){
    setSaving(true);
    try{
      const amt=Number(current.sales?.requestedAmount)||0;
      const nextStatus=toApproval?(amt>CFO_LIMIT?"pending_committee":"pending_cfo"):"in_review";
      const saved={...current,finance:fin,score,rec:{l:rec.l,r:rec.r,c:rec.c,t:rec.t},flags,status:nextStatus};
      await dbSaveReq(saved);
      setToast({m:toApproval?`נשלח לאישור ${amt>CFO_LIMIT?'ועדת אשראי':'סמנכ"ל כספים'} ✅`:"נשמר",ok:true});
      if(toApproval){
        const st2=await dbLoadSettings();
        const cfoEmail=getEmailForRole(st2,"cfo");
        if(cfoEmail){
          const dest=amt>CFO_LIMIT?"ועדת אשראי":'סמנכ"ל כספים';
          sendEmailNotification(
            cfoEmail,
            `בקשת אשראי ממתינה לאישורך — ${current.sales?.customerName||""}`,
            `שלום,

סקירת אשראי הושלמה ובקשה חדשה ממתינה לאישור ${dest}:

לקוח: ${current.sales?.customerName||"—"}
מסגרת: $${Number(current.sales?.requestedAmount||0).toLocaleString()}
ציון: ${saved.score?.norm||"—"}/100

נא להיכנס למערכת לאישור.

מערכת אשראי פרידנזון`
          );
        }
      }
      if(toApproval){setCurrent(null);setFin({...EMPTY_FIN});}
      await refresh();
    }catch{setToast({m:"שגיאה",ok:false});}
    setSaving(false);
  }

  const pending=requests.filter(r=>["submitted","in_review"].includes(r.status));
  const done=requests.filter(r=>!["submitted","in_review","draft"].includes(r.status));
  const sf=k=>v=>setFin(p=>({...p,[k]:v}));

  if(current){
    const s=current.sales||{};
    return(
      <div style={{maxWidth:1400,margin:"0 auto",padding:isMobile?"12px":"20px",fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>סקירת בקשת אשראי</h1>
            <p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>{s.customerName} · {fmtAmt(s.requestedAmount)} · {s.paymentTerms}</p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <StatusBadge status={current.status}/>
            <button style={mkBtn("#334155",false)} onClick={()=>setCurrent(null)}>← חזרה</button>
            <button style={mkBtn("#475569",false,saving)} onClick={()=>save(false)} disabled={saving}>💾 שמור</button>
            <button style={mkBtn(readyToSend?"#10B981":"#334155",false,!readyToSend||saving)} onClick={()=>save(true)} disabled={!readyToSend||saving}>
              📤 {Number(s.requestedAmount||0)>CFO_LIMIT?'שלח לוועדת אשראי':'שלח לסמנכ"ל כספים'}
            </button>
          </div>
        </div>
        {bdiBlocked&&<div style={{marginBottom:16,padding:"12px 16px",background:"#2d0707",border:"2px solid #EF4444",borderRadius:10,fontSize:13,fontWeight:700,color:"#EF4444"}}>
          ⛔ בקשה חסומה — דירוג BDI {fin.bdi} אינו מאפשר קבלת אשראי. לא ניתן להעביר לאישור.
        </div>}
        {!readyToSend&&!bdiBlocked&&<div style={{marginBottom:16,padding:"10px 14px",background:"#271b06",border:"1px solid #7F6D00",borderRadius:8,fontSize:12,color:"#FDE68A"}}>
          ⚠ להפעלת כפתור שליחה: מלא לפחות 10 קטגוריות + BDI + כיסוי כלל
        </div>}
        <div style={{display:isMobile?"block":"grid",gridTemplateColumns:"1fr 310px",gap:20,alignItems:"start"}}>
          <div>
            {/* Mobile mini score */}
            {isMobile&&score.norm>0&&(
              <div style={{...crd,marginBottom:12,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"}}>
                <div style={{textAlign:"center",minWidth:50}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>SCORE</div>
                  <div style={{fontSize:30,fontWeight:900,color:rec.c,lineHeight:1}}>{score.norm}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:rec.c,marginBottom:2}}>{rec.l} · {rec.r}</div>
                  {bdiBlocked&&<div style={{fontSize:11,color:"#EF4444",fontWeight:700}}>⛔ BDI {fin.bdi} חסום</div>}
                </div>
              </div>
            )}
            {/* Customer Summary */}
            <div style={{...crd,borderColor:C.cb}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>סיכום הבקשה</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12}}>
                <div><div style={lbl}>לקוח</div><div style={{fontWeight:700,fontSize:14,color:C.text}}>{s.customerName}</div><div style={{fontSize:11,color:C.muted}}>{s.hp} · {s.industry}</div></div>
                <div><div style={lbl}>מסגרת</div><div style={{fontWeight:700,fontSize:14,color:C.text}}>{fmtAmt(s.requestedAmount)}</div><div style={{fontSize:11,color:C.muted}}>{s.paymentTerms}</div></div>
                <div><div style={lbl}>חשיפה</div><div style={{fontSize:12}}><span style={{color:"#93C5FD"}}>הובלה: {s.freightPct||"—"}%</span> · <span style={{color:"#FCA5A5"}}>מיסים: {s.taxPct||"—"}%</span></div>
                  <div style={{fontSize:11,color:C.muted}}>מנהל: {s.salesPerson||"—"}</div>
                </div>
              </div>
              {s.specialCircumstances&&<div style={{marginTop:10,padding:"8px 12px",background:C.infoBox,borderRadius:8,fontSize:12,color:C.muted,fontStyle:"italic"}}>{s.specialCircumstances}</div>}
            </div>
            {/* BDI — כניסה אוטומטית / ידנית */}
            <BDISection customerName={s.customerName} hp={s.hp} fin={fin} sf={sf}/>
            {/* Manual BDI + Klal Entry */}
            <div style={crd}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>📊 דירוג BDI — סולם 1 עד 10</div>
              <div style={{padding:"10px 14px",background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,marginBottom:14,fontSize:12,color:"#93C5FD"}}>
                1–4: ללא סיכון · 5: נמוך · 6–7: בינוני · 8: גבוה · <strong style={{color:"#EF4444"}}>9–10: אסור לאשראי ⛔</strong>
              </div>
              <div style={g2}>
                <Fld label="תאריך הפקת דוח BDI"><Inp value={fin.bdiDate||""} onChange={sf("bdiDate")} type="date"/></Fld>
              </div>
              {/* BDI Visual 1-10 Selector */}
              <BdiSelect value={fin.bdi} onChange={sf("bdi")}/>

              {/* Full BDI Report for Committee */}
              <div style={{marginTop:14,padding:14,background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:10}}>
                <div style={{fontSize:12,fontWeight:700,color:"#93C5FD",marginBottom:8}}>📄 שמירת דוח BDI מלא לוועדה</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.7}}>
                  פתח את דוח BDI המלא בדפדפן → העתק את תוכן הדוח והדבק כאן. הדוח יוצג לחברי הוועדה בעת הצבעה.
                </div>
                <div style={{marginBottom:10}}>
                  <label style={lbl}>תוכן דוח BDI (הדבק מהאתר)</label>
                  <textarea
                    style={{...inp, minHeight:120, resize:"vertical", fontFamily:"monospace", fontSize:12, lineHeight:1.6}}
                    value={fin.bdiReport||""}
                    onChange={e=>sf("bdiReport")(e.target.value)}
                    placeholder={`הדבק כאן את תוכן דוח BDI המלא...\n\nלדוגמה:\nשם חברה: ...\nמספר ח.פ: ...\nדירוג: ...\nהון עצמי: ...\nיתרת חובות: ...\nהמלצת BDI: ...`}
                  />
                </div>
                {fin.bdiReport && (
                  <div style={{padding:"6px 10px",background:"#022c22",border:"1px solid #10B98150",borderRadius:6,fontSize:11,color:"#10B981"}}>
                    ✅ דוח BDI שמור — {fin.bdiReport.length} תווים · יוצג לוועדה
                  </div>
                )}
              </div>
              {/* Klal coverage with auto-scoring from amount */}
              <div style={{marginBottom:14}}>
                <label style={lbl}>2. כיסוי כלל ביטוח <span style={{color:C.muted}}>/ 20</span></label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                  <div>
                    <label style={{...lbl,marginBottom:4}}>סוג כיסוי</label>
                    <select style={{...sel,borderColor:fin.klal===0?"#7F1D1D":fin.klal!==null?"#00B4C8":C.ib}} value={fin.klal!==null?String(fin.klal):""} onChange={e=>{const v=e.target.value;sf("klal")(v===""?null:Number(v));sf("klarApproved")("");}}>
                      <option value="">— בחר —</option>
                      {SCORING.klal.map((o,i)=>(<option key={i} value={String(o.v)}>{o.l} ({o.v} נק׳)</option>))}
                    </select>
                  </div>
                  {(fin.klal===8||fin.klal===14||fin.klal===3)&&(
                    <div>
                      <label style={{...lbl,marginBottom:4}}>סכום כיסוי מאושר ($)</label>
                      <input style={{...inp}} type="number" value={fin.klarApproved||""} placeholder="60000"
                        onChange={e=>{
                          const amt=Number(e.target.value)||0;
                          const req=Number(s.requestedAmount)||0;
                          sf("klarApproved")(String(amt));
                          if(amt>0&&req>0){
                            const pct=(amt/req)*100;
                            if(pct>=100) sf("klal")(20);
                            else if(pct>=60) sf("klal")(14);
                            else sf("klal")(8);
                          }
                        }}
                      />
                      {fin.klarApproved&&s.requestedAmount&&(
                        <div style={{fontSize:11,color:"#38BDF8",marginTop:3}}>
                          כיסוי: {Math.round((Number(fin.klarApproved)/Number(s.requestedAmount))*100)}% מהמסגרת המבוקשת
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {fin.klal!==null&&<div style={{height:4,background:C.ib,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round((fin.klal/20)*100)}%`,background:fin.klal===0?"#EF4444":fin.klal>=14?"#10B981":"#FBBF24",borderRadius:2,transition:"width 0.3s"}}/></div>}
              </div>

              {/* Klal Insurance Document */}
              <div style={{marginTop:14,padding:14,background:C.infoBox,border:"1px solid #06B6D440",borderRadius:10}}>
                <div style={{fontSize:12,fontWeight:700,color:"#67E8F9",marginBottom:8}}>📋 תיוק אישור כלל ביטוח לוועדה</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.7}}>
                  פתח את החלטת כלל ביטוח → העתק את תוכן האישור/הסירוב והדבק כאן. המסמך יוצג לוועדה בעת הצבעה.
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <Fld label="תאריך החלטת כלל">
                    <Inp value={fin.klarReportDate||""} onChange={sf("klarReportDate")} type="date"/>
                  </Fld>
                  <Fld label="מספר פוליסה / אסמכתא">
                    <Inp value={fin.klarRefNum||""} onChange={sf("klarRefNum")} placeholder="123456789"/>
                  </Fld>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={lbl}>תוכן החלטת כלל ביטוח (הדבק מהמסמך)</label>
                  <textarea
                    style={{...inp, minHeight:100, resize:"vertical", fontFamily:"monospace", fontSize:12, lineHeight:1.6}}
                    value={fin.klarReport||""}
                    onChange={e=>sf("klarReport")(e.target.value)}
                    placeholder={`הדבק כאן את תוכן ההחלטה מכלל ביטוח...\n\nלדוגמה:\nלקוח: ...\nמסגרת מבוקשת: $...\nסכום מאושר: $...\nתנאים מיוחדים: ...\nתוקף הכיסוי עד: ...`}
                  />
                </div>
                {fin.klarReport ? (
                  <div style={{padding:"6px 10px",background:"#022c22",border:"1px solid #06B6D450",borderRadius:6,fontSize:11,color:"#67E8F9"}}>
                    ✅ אישור כלל שמור — {fin.klarReport.length} תווים · יוצג לוועדה
                  </div>
                ) : (
                  <div style={{padding:"6px 10px",background:C.infoBox,borderRadius:6,fontSize:11,color:C.muted}}>
                    ⏳ ממתין להדבקת מסמך כלל ביטוח
                  </div>
                )}
              </div>
            </div>
            {/* Scoring Categories */}
            <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>קטגוריה 3 | היסטוריית תשלומים <span style={{color:C.muted,fontWeight:400,fontSize:12}}>(25 נק׳)</span></div>
              {s.isExisting==="new" ? (
                <div style={{padding:"14px",background:"#1C1806",border:"1px solid #7F6D00",borderRadius:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#FDE68A",marginBottom:6}}>🆕 לקוח חדש — קטגוריה 3 לא רלוונטית</div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>היסטוריית תשלומים קיימת רק ללקוחות ותיקים. עבור לקוח חדש קטגוריה זו מקבלת ציון ניטרלי (12/25).</div>
                  <button style={{...mkBtn("#7F6D00",true),marginTop:10}} onClick={()=>{sf("hSen")(2);sf("hTime")(7);sf("hDebt")(4);}}>החל ציון ניטרלי לקוח חדש</button>
                </div>
              ):(
                <>
                  <ScoSel label="3א. ותק כלקוח" opts={SCORING.hSen} value={fin.hSen} onChange={sf("hSen")} max={8}/>
                  <ScoSel label="3ב. עמידה בתנאי תשלום" opts={SCORING.hTime} value={fin.hTime} onChange={sf("hTime")} max={10}/>
                  <ScoSel label="3ג. שיאי חוב בעבר" opts={SCORING.hDebt} value={fin.hDebt} onChange={sf("hDebt")} max={7}/>
                </>
              )}
              <div style={{background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,padding:"7px 12px",fontSize:12,color:"#93C5FD",marginTop:8}}>סה״כ: <strong>{score.c3}</strong>/25</div>
            </div>
            <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>קטגוריה 4 | פרופיל עסקי <span style={{color:C.muted,fontWeight:400,fontSize:12}}>(15 נק׳)</span></div>
              <div style={{padding:"8px 12px",background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,marginBottom:12,fontSize:11,color:"#93C5FD"}}>
                💡 מידע זה מגיע מדוח BDI (ותק, ענף, מבנה). אם הדוח לא זמין — הזן ידנית.
              </div>
              <ScoSel label="4א. ותק עסקי של החברה" opts={SCORING.bSen} value={fin.bSen} onChange={sf("bSen")} max={5}/>
              <ScoSel label="4ב. ענף הפעילות" opts={SCORING.bSec} value={fin.bSec} onChange={sf("bSec")} max={5}/>
              <ScoSel label="4ג. מבנה משפטי / בעלות" opts={SCORING.bStr} value={fin.bStr} onChange={sf("bStr")} max={5}/>
              <div style={{background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,padding:"7px 12px",fontSize:12,color:"#93C5FD",marginTop:4}}>סה״כ: <strong>{score.c4}</strong>/15</div>
            </div>
            <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>קטגוריה 5 | יחסים פיננסיים <span style={{color:C.muted,fontWeight:400,fontSize:12}}>(10 נק׳)</span></div>
              <div style={{background:"#1C1806",border:"1px solid #2D2A0E",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#FDE68A"}}>💡 אם הנתונים אינם זמינים — השאר ריק (ניטרלי: 5 נק׳)</div>
              <ScoSel label="5א. יחס חוב להון" opts={SCORING.fDebt} value={fin.fDebt} onChange={sf("fDebt")} max={4}/>
              <ScoSel label="5ב. יחס שוטף" opts={SCORING.fCurr} value={fin.fCurr} onChange={sf("fCurr")} max={3}/>
              <ScoSel label="5ג. מגמת הכנסות" opts={SCORING.fRev} value={fin.fRev} onChange={sf("fRev")} max={3}/>
            </div>
            <div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>קטגוריות 6–9 | חלקן חושב אוטומטית מהבקשה</div>
              <div style={{padding:"8px 12px",background:"#022c22",border:"1px solid #10B98140",borderRadius:8,marginBottom:12,fontSize:11,color:"#10B981"}}>
                ✅ קטגוריות אלו חושבו אוטומטית מנתוני הבקשה. ניתן לעדכן ידנית אם נדרש.
              </div>
              <ScoSel label="6. סוג חשיפה (הובלה/מיסים)" opts={SCORING.exp} value={fin.exp} onChange={sf("exp")} max={5}/>
              <ScoSel label="7. תנאי תשלום" opts={SCORING.terms} value={fin.terms} onChange={sf("terms")} max={15}/>
              <Fld label="8. גובה אשראי ביחס לשווי משלוחים">
                <ScoSel label="" opts={SCORING.ratio} value={fin.ratio} onChange={sf("ratio")} max={3}/>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>* מחושב כיחס בין האשראי המבוקש לרווח השנתי המשוער</div>
              </Fld>
              <Fld label="9. לקוח סינרגי">
                <ScoSel label="" opts={[{l:"לא סינרגי",v:0},{l:"פוטנציאל גבוה",v:1},{l:"לקוח קבוצתי / שותף אסטרטגי",v:3}]} value={fin.synergy} onChange={sf("synergy")} max={3}/>
                {s.isSynergy&&s.isSynergy!=="no"&&<div style={{fontSize:11,color:C.muted,marginTop:4,padding:"5px 8px",background:C.inp,borderRadius:6}}>📝 {s.synergyDetails||"פרטי סינרגיה מהבקשה"}</div>}
              </Fld>
            </div>
            <div style={crd}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#D97706",borderRadius:2}}/>סיכום הרפרנטית</div>
              <div style={{padding:"8px 12px",background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,marginBottom:12,fontSize:11,color:"#93C5FD"}}>
                הרפרנטית אינה ממליצה — תפקידה לסכם את הנתונים ולהעביר לגוף המאשר.
              </div>
              <Fld label="הערות וסיכום לוועדה"><Ta value={fin.finNotes||""} onChange={sf("finNotes")} placeholder="סכם את הממצאים, נקודות מיוחדות לתשומת לב הוועדה..."/></Fld>
            </div>
          </div>
          <ScorePanel score={score} flags={flags} rec={rec}/>
        </div>
        {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
      </div>
    );
  }

  return(
    <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
      <div style={{marginBottom:20}}><h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>בקשות לטיפול — רפרנטית אשראי</h1><p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>בחר בקשה לסקירה ודירוג</p></div>
      {pending.length>0&&<div style={{...crd,border:"1px solid #8B5CF650"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#8B5CF6",marginBottom:14}}>📥 ממתינות לסקירה ({pending.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {pending.map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:C.inp,borderRadius:10,border:`1px solid ${r.status==="submitted"?"#8B5CF6":C.cb}`,cursor:"pointer"}} onClick={()=>open(r.id)}>
              <div style={{flex:1}}><div style={{fontWeight:700,color:C.text,marginBottom:2}}>{r.customerName}</div><div style={{fontSize:12,color:C.muted}}>{fmtAmt(r.amount)} · {r.paymentTerms} · {r.salesPerson||"—"}</div></div>
              <StatusBadge status={r.status}/>
              <div style={{fontSize:11,color:C.muted}}>{fmtDate(r.updatedAt)}</div>
              <button style={mkBtn("#8B5CF6",true)}>פתח ›</button>
            </div>
          ))}
        </div>
      </div>}
      {pending.length===0&&<div style={{...crd,textAlign:"center",padding:40}}><div style={{fontSize:40,marginBottom:10}}>✅</div><div style={{color:C.muted}}>אין בקשות ממתינות לסקירה</div></div>}
      {done.length>0&&<div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:12}}>היסטוריה ({done.length})</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {done.slice(0,10).map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:C.inp,borderRadius:8}}>
              <div style={{flex:1,fontSize:13,color:C.muted}}>{r.customerName}</div>
              <div style={{fontSize:12,color:C.muted}}>{fmtAmt(r.amount)}</div>
              <StatusBadge status={r.status}/>
              <div style={{fontSize:11,color:C.muted}}>{fmtDate(r.updatedAt)}</div>
            </div>
          ))}
        </div>
      </div>}
      {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ══════ APPROVAL VIEW (CFO + Committee) ══
// ══════ COMMITTEE MEMBERS (hardcoded) ════
const COMMITTEE = [
  { key:"cfo",      name:'סמנכ"ל כספים',  icon:"💼", color:"#F59E0B", isUser:true,  veto:false },
  { key:"ceo_ship", name:"מנכ\"ל שילוח",   icon:"🚢", color:"#3B82F6", isUser:false, veto:false },
  { key:"ceo_pri",  name:"מנכ\"ל פרידנזון", icon:"🏢", color:"#EF4444", isUser:false, veto:true  },
];

function calcCommitteeResult(votes){
  if(Object.keys(votes).length < 3) return null;
  const ceoVote = votes["ceo_pri"]?.decision;
  // CEO of Fridenson has absolute veto in BOTH directions:
  // - If CEO rejects → rejected regardless of others
  // - If CEO approves but majority rejects → majority wins (CEO cannot override rejection alone)
  // - If CEO rejects but majority approves → rejected_veto
  const othersApprove = ["cfo","ceo_ship"].filter(k=>votes[k]?.decision==="approve"||votes[k]?.decision==="conditional").length;
  const othersReject  = ["cfo","ceo_ship"].filter(k=>votes[k]?.decision==="reject").length;
  if(ceoVote==="reject") return "rejected_veto"; // CEO veto on approval
  if(ceoVote==="approve"||ceoVote==="conditional"){
    if(othersReject===2) return "rejected"; // majority overrides CEO approval
    if(othersApprove>=1){
      const anyConditional=Object.values(votes).some(v=>v.decision==="conditional");
      return anyConditional?"conditional":"approved";
    }
  }
  // Check majority without CEO
  const totalApprove = Object.values(votes).filter(v=>v.decision==="approve"||v.decision==="conditional").length;
  const totalReject  = Object.values(votes).filter(v=>v.decision==="reject").length;
  if(totalApprove>=2) return Object.values(votes).some(v=>v.decision==="conditional")?"conditional":"approved";
  if(totalReject>=2) return "rejected";
  return null;
}

// ══════ REQUEST DETAIL BLOCK (shared) ════
function RequestDetail({current}){
  const s=current.sales||{};
  const sc=current.score||{norm:0,c1:0,c2:0,c3:0,c4:0,c5:0,c6:0,c7:0,c8:0,raw:0};
  const rc=current.rec||{l:"—",r:"—",c:C.muted,bg:C.card,t:3};
  const fl=current.flags||[];
  const amt=Number(s.requestedAmount||0);
  return(
    <>
      <div style={{...crd,borderColor:C.cb}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <div><div style={lbl}>לקוח</div><div style={{fontWeight:800,fontSize:15,color:C.text}}>{s.customerName}</div><div style={{fontSize:12,color:C.muted}}>{s.hp} · {s.industry}</div></div>
          <div><div style={lbl}>מסגרת ותנאים</div><div style={{fontWeight:800,fontSize:15,color:amt>CFO_LIMIT?"#F97316":"#F8FAFC"}}>{fmtAmt(s.requestedAmount)}</div><div style={{fontSize:12,color:C.muted}}>{s.paymentTerms} · {s.serviceType||"—"}</div></div>
          <div><div style={lbl}>ציון אשראי</div><div style={{fontWeight:900,fontSize:22,color:rc.c}}>{sc.norm}/100</div><div style={{fontSize:12,color:C.muted}}>{rc.l}</div></div>
        </div>
      </div>
      <div style={crd}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:14,background:"#D97706",borderRadius:2}}/>סיכום ציון</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
          {[["BDI",sc.c1,30],["כלל",sc.c2,30],["היסטוריה",sc.c3,15],["פרופיל",sc.c4,10],["פיננסי",sc.c5,8],["חשיפה",sc.c6,3],["תנאים",sc.c7,3],["סכום",sc.c8,3],["סינרגיה",sc.c9||0,3]].map(([l,s,m],i)=>{
            const pct=Math.round((s/m)*100);const col=pct>=60?"#10B981":pct>=35?"#FBBF24":"#EF4444";
            return(<div key={i} style={{padding:"7px 8px",background:C.inp,borderRadius:6,textAlign:"center"}}><div style={{fontSize:9,color:C.muted,marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:900,color:col}}>{s}/{m}</div></div>);
          })}
        </div>
        <div style={{background:rc.bg,border:`1px solid ${rc.c}40`,borderRadius:8,padding:"8px 12px",marginBottom:fl.length>0?8:0}}>
          <div style={{fontSize:12,fontWeight:700,color:rc.c}}>{rc.r}</div>
          {current.finance?.finNotes&&<div style={{marginTop:4,fontSize:11,color:C.muted,fontStyle:"italic"}}>הערת רפרנטית: {current.finance.finNotes}</div>}
        </div>
        {fl.length>0&&<div style={{marginTop:6}}><div style={{fontSize:10,color:"#EF4444",fontWeight:700,marginBottom:4}}>⚠ דגלי סיכון:</div>{fl.map((f,i)=><div key={i} style={{color:"#FCA5A5",fontSize:11,padding:"2px 6px",background:"#1f0505",borderRadius:3,marginBottom:2}}>🚩 {f}</div>)}</div>}
        {current.finance?.bdiReport&&<div style={{marginTop:10,padding:10,background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8}}><div style={{fontSize:11,fontWeight:700,color:"#93C5FD",marginBottom:4}}>📄 דוח BDI</div><div style={{fontSize:11,color:C.text,fontFamily:"monospace",whiteSpace:"pre-wrap",lineHeight:1.6,maxHeight:160,overflow:"auto"}}>{current.finance.bdiReport}</div></div>}
        {current.finance?.klarReport&&<div style={{marginTop:8,padding:10,background:C.infoBox,border:"1px solid #06B6D440",borderRadius:8}}><div style={{fontSize:11,fontWeight:700,color:"#67E8F9",marginBottom:4}}>📋 אישור כלל ביטוח {current.finance.klarRefNum?`#${current.finance.klarRefNum}`:""}</div><div style={{fontSize:11,color:C.text,fontFamily:"monospace",whiteSpace:"pre-wrap",lineHeight:1.6,maxHeight:120,overflow:"auto"}}>{current.finance.klarReport}</div></div>}
      </div>
    </>
  );
}

// ══════ APPROVAL VIEW ════════════════════
function ApprovalView({role, currentUser, isMobile}){
  const isCommittee = role==="committee";
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [current,setCurrent]=useState(null);
  // CFO single signature
  const [form,setForm]=useState({signerName:"",decision:"approve",conditions:"",notes:""});
  // Committee votes — one per member
  const [votes,setVotes]=useState({});
  const [sessionNotes,setSessionNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);

  const myStatus=isCommittee?"pending_committee":"pending_cfo";
  const refresh=useCallback(async()=>{setLoading(true);setRequests(await dbLoadIdx());setLoading(false);},[]);
  useEffect(()=>{refresh();},[]);

  function open(id){dbLoadReq(id).then(r=>{if(!r)return;setCurrent(r);setForm({signerName:"",decision:"approve",conditions:"",notes:""});setVotes(r.committeeVotes||{});setSessionNotes(r.sessionNotes||"");});}

  // CFO approval (sub-committee-limit)
  async function approveCFO(){
    if(!form.signerName.trim()){setToast({m:"חובה להזין שם",ok:false});return;}
    setSaving(true);
    try{
      const decMap={approve:"approved",conditional:"conditional",reject:"rejected"};
      const approval={signerName:form.signerName,decision:form.decision,conditions:form.conditions,notes:form.notes,timestamp:new Date().toISOString()};
      await dbSaveReq({...current,status:decMap[form.decision]||"approved",approval});
      setToast({m:form.decision==="approve"?"✅ אושרה":form.decision==="conditional"?"📋 אושרה בתנאים":"❌ נדחתה",ok:form.decision!=="reject"});
      setCurrent(null);await refresh();
    }catch{setToast({m:"שגיאה",ok:false});}
    setSaving(false);
  }

  // Committee vote recording
  function setVote(memberKey, field, val){
    setVotes(p=>({...p,[memberKey]:{...(p[memberKey]||{}),timestamp:new Date().toISOString(),[field]:val}}));
  }
  const committeeResult = calcCommitteeResult(votes);
  const allVoted = Object.keys(votes).length === 3 && COMMITTEE.every(m=>votes[m.key]?.decision);

  async function finalizeCommittee(){
    if(!allVoted){setToast({m:"כל חברי הועדה חייבים להצביע לפני הסגירה",ok:false});return;}
    setSaving(true);
    try{
      const statusMap={approved:"approved",conditional:"conditional",rejected:"rejected",rejected_veto:"rejected"};
      const finalStatus = statusMap[committeeResult]||"rejected";
      await dbSaveReq({...current,status:finalStatus,committeeVotes:votes,committeeResult,sessionNotes,committeeDate:new Date().toISOString()});
      const resultLabel={approved:"✅ אושרה ברוב קולות",conditional:"📋 אושרה בתנאים ברוב קולות",rejected:"❌ נדחתה ברוב קולות",rejected_veto:"⛔ נדחתה — וטו מנכ\"ל פרידנזון"}[committeeResult]||"סגורה";
      setToast({m:resultLabel,ok:finalStatus!=="rejected"});
      setCurrent(null);await refresh();
    }catch{setToast({m:"שגיאה",ok:false});}
    setSaving(false);
  }

  const myReqs=requests.filter(r=>r.status===myStatus);
  const done=requests.filter(r=>["approved","conditional","rejected"].includes(r.status));
  const decColor={approve:"#10B981",conditional:"#06B6D4",reject:"#EF4444"};
  const resultConfig={
    approved:{label:"✅ יאושר ברוב קולות",c:"#10B981",bg:"#022c22"},
    conditional:{label:"📋 יאושר בתנאים ברוב קולות",c:"#06B6D4",bg:"#0a2436"},
    rejected:{label:"❌ יידחה ברוב קולות",c:"#EF4444",bg:"#2d0707"},
    rejected_veto:{label:"⛔ וטו מנכ\"ל פרידנזון — נדחה",c:"#EF4444",bg:"#2d0707"},
  };

  // ── Single request open ────────────────
  if(current){
    if(isCommittee){
      // ── COMMITTEE VOTING PANEL ──────────
      return(
        <div style={{maxWidth:1400,margin:"0 auto",padding:isMobile?"12px":"20px",fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div>
              <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>⚖️ ישיבת ועדת אשראי</h1>
              <p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>{current.sales?.customerName} · {fmtAmt(current.sales?.requestedAmount)} · {new Date().toLocaleDateString("he-IL")}</p>
            </div>
            <button style={mkBtn("#334155",false)} onClick={()=>setCurrent(null)}>← חזרה</button>
          </div>

          {/* Committee context banner */}
          <div style={{...crd,background:C.infoBox,borderColor:C.cb,marginBottom:16}}>
            <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#93C5FD"}}>חברי הועדה הנוכחים:</div>
              {COMMITTEE.map(m=>(
                <div key={m.key} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:m.color+"20",border:`1px solid ${m.color}50`,borderRadius:8}}>
                  <span>{m.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:m.color}}>{m.name}</span>
                  {m.veto&&<span style={{fontSize:10,color:"#EF4444",fontWeight:700}}>(וטו)</span>}
                  {votes[m.key]?.decision&&<span style={{fontSize:14}}>{votes[m.key].decision==="approve"||votes[m.key].decision==="conditional"?"✅":"❌"}</span>}
                </div>
              ))}
            </div>
          </div>

          <RequestDetail current={current}/>

          {/* Voting cards for each member */}
          <div style={{...crd,border:"2px solid #F97316"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#F97316",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:"#F97316",borderRadius:2}}/>📊 רישום הצבעות ועדת האשראי</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {COMMITTEE.map(member=>{
                const v = votes[member.key]||{};
                const hasVoted = !!v.decision;
                const vColor = v.decision==="approve"?"#10B981":v.decision==="conditional"?"#06B6D4":v.decision==="reject"?"#EF4444":C.muted;
                return(
                  <div key={member.key} style={{padding:16,background:hasVoted?vColor+"15":"#111F35",border:`2px solid ${hasVoted?vColor:C.cb}`,borderRadius:12,transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <span style={{fontSize:22}}>{member.icon}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:member.color}}>{member.name}</div>
                        {member.veto&&<div style={{fontSize:10,color:"#EF4444",fontWeight:700}}>⚡ וטו כפול — דחייה = דחיית הכל · אישור = גובר על 1 דוחה</div>}
                        {!member.isUser&&<div style={{fontSize:10,color:C.muted}}>נוכח פיזית — הקלד את הצבעתו</div>}
                        {member.isUser&&<div style={{fontSize:10,color:"#93C5FD"}}>מחובר למערכת</div>}
                      </div>
                      {hasVoted&&<div style={{marginRight:"auto",padding:"4px 12px",borderRadius:20,background:vColor+"25",border:`1px solid ${vColor}50`,fontSize:12,fontWeight:700,color:vColor}}>
                        {v.decision==="approve"?"✅ מאשר":v.decision==="conditional"?"📋 מאשר בתנאים":"❌ דוחה"}
                      </div>}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:12,alignItems:"start"}}>
                      <div>
                        <div style={lbl}>הצבעה</div>
                        <Rg options={[{l:"✅ מאשר",v:"approve"},{l:"📋 בתנאים",v:"conditional"},{l:"❌ דוחה",v:"reject"}]} value={v.decision||""} onChange={val=>setVote(member.key,"decision",val)}/>
                      </div>
                      <div>
                        <Fld label="הערות / נימוק"><Ta value={v.notes||""} onChange={val=>setVote(member.key,"notes",val)} placeholder={`הקלד את עמדת ${member.name}...`}/></Fld>
                        {v.decision==="conditional"&&<Fld label="תנאים לאישור"><Ta value={v.conditions||""} onChange={val=>setVote(member.key,"conditions",val)} placeholder="פרט תנאים..."/></Fld>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live result */}
          {allVoted&&committeeResult&&(
            <div style={{...crd,border:`2px solid ${resultConfig[committeeResult]?.c||"#F97316"}`,background:resultConfig[committeeResult]?.bg||C.card}}>
              <div style={{fontSize:18,fontWeight:900,color:resultConfig[committeeResult]?.c,marginBottom:6}}>
                {resultConfig[committeeResult]?.label}
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
                {Object.values(votes).filter(v=>v.decision==="approve"||v.decision==="conditional").length} מאשרים · {Object.values(votes).filter(v=>v.decision==="reject").length} דוחים
                {committeeResult==="rejected_veto"&&" · וטו מנכ\"ל פרידנזון"}
              </div>
              <Fld label="פרוטוקול ישיבה / הערות כלליות">
                <Ta value={sessionNotes} onChange={setSessionNotes} placeholder="תוכן הדיון, החלטות מיוחדות, תנאים..."/>
              </Fld>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
                <button style={mkBtn(resultConfig[committeeResult]?.c||"#F97316",false,saving)} onClick={finalizeCommittee} disabled={saving}>
                  {saving?"⏳ שומר...":"🔒 סגור ותייק החלטת ועדה"}
                </button>
              </div>
            </div>
          )}
          {allVoted&&!committeeResult&&<div style={{...crd,background:"#271b06",border:"1px solid #7F6D00",fontSize:13,color:"#FDE68A",textAlign:"center",padding:16}}>⏳ ממתין לכל ההצבעות לפני חישוב תוצאה</div>}

          {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
        </div>
      );
    } else {
      // ── CFO SINGLE APPROVAL ─────────────
      return(
        <div style={{maxWidth:1400,margin:"0 auto",padding:isMobile?"12px":"20px",fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div><h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>💼 אישור בקשת אשראי</h1><p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>{current.sales?.customerName} · {fmtAmt(current.sales?.requestedAmount)}</p></div>
            <button style={mkBtn("#334155",false)} onClick={()=>setCurrent(null)}>← חזרה</button>
          </div>
          <RequestDetail current={current}/>
          <div style={{...crd,border:`2px solid ${decColor[form.decision]||C.cb}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:16,background:decColor[form.decision]||"#D97706",borderRadius:2}}/>✍ חתימה דיגיטלית — סמנכ"ל כספים</div>
            <div style={{background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,padding:10,marginBottom:14,fontSize:12,color:"#93C5FD"}}>הזן שמך המלא — ישמש כחתימה דיגיטלית עם חותמת זמן אוטומטית.</div>
            <div style={g2}>
              <Fld label="שם מלא (= חתימה) *"><Inp value={form.signerName} onChange={v=>setForm(p=>({...p,signerName:v}))} placeholder="הקלד שמך המלא"/></Fld>
              <Fld label="החלטה *"><Rg options={[{l:"✅ מאשר",v:"approve"},{l:"📋 מאשר בתנאים",v:"conditional"},{l:"❌ דוחה",v:"reject"}]} value={form.decision} onChange={v=>setForm(p=>({...p,decision:v}))}/></Fld>
            </div>
            {form.decision==="conditional"&&<Fld label="תנאים לאישור"><Ta value={form.conditions} onChange={v=>setForm(p=>({...p,conditions:v}))} placeholder="פרט תנאים..."/></Fld>}
            <Fld label="הערות"><Ta value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="הערות לתיק..."/></Fld>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,color:C.muted}}>⏰ חותמת זמן תוסף אוטומטית</div>
              <button style={mkBtn(form.signerName.trim()?decColor[form.decision]||"#10B981":"#334155",false,!form.signerName.trim()||saving)} onClick={approveCFO} disabled={!form.signerName.trim()||saving}>
                ✍ {form.decision==="approve"?"אשר":form.decision==="conditional"?"אשר בתנאים":"דחה"}
              </button>
            </div>
          </div>
          {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
        </div>
      );
    }
  }

  // ── Request list ─────────────────────────
  const listTitle = isCommittee ? "ועדת אשראי — בקשות לדיון" : 'אישורי סמנכ"ל כספים';
  const listDesc  = isCommittee ? `בקשות מעל ${fmtAmt(CFO_LIMIT)} לדיון ועדה` : `בקשות עד ${fmtAmt(CFO_LIMIT)} לאישורך`;
  const accentC   = isCommittee ? "#F97316" : "#F59E0B";
  return(
    <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>{isCommittee?"⚖️":"💼"} {listTitle}</h1>
        <p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>{listDesc}</p>
        {isCommittee&&<div style={{marginTop:10,padding:"8px 14px",background:C.infoBox,border:`1px solid ${C.cb}`,borderRadius:8,fontSize:12,color:"#93C5FD"}}>
          חברי הועדה: 💼 סמנכ"ל כספים · 🚢 מנכ"ל שילוח · 🏢 מנכ"ל פרידנזון (וטו) | אישור: רוב קולות (2/3)
        </div>}
      </div>
      {loading?<div style={{textAlign:"center",padding:40,color:C.muted}}>⏳</div>:myReqs.length===0?(
        <div style={{...crd,textAlign:"center",padding:50}}><div style={{fontSize:40,marginBottom:10}}>✅</div><div style={{color:C.muted}}>אין בקשות ממתינות</div></div>
      ):(
        <div style={{...crd,border:`1px solid ${accentC}50`}}>
          <div style={{fontSize:14,fontWeight:700,color:accentC,marginBottom:14}}>🔔 ממתינות ({myReqs.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {myReqs.map(r=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.inp,borderRadius:10,border:`1px solid ${accentC}40`,cursor:"pointer"}} onClick={()=>open(r.id)}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:C.text,marginBottom:2}}>{r.customerName}</div>
                  <div style={{fontSize:12,color:C.muted}}>{fmtAmt(r.amount)} · {r.paymentTerms} · ציון: <strong style={{color:r.color||C.muted}}>{r.score}</strong></div>
                </div>
                <StatusBadge status={r.status}/>
                <div style={{fontSize:11,color:C.muted}}>{fmtDate(r.updatedAt)}</div>
                <button style={mkBtn(accentC,true)}>{isCommittee?"פתח לוועדה ›":"אשר ›"}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {done.length>0&&<div style={crd}><div style={{fontSize:14,fontWeight:700,color:C.muted,marginBottom:10}}>היסטוריה</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {done.slice(0,10).map(r=>{
            const cv=r.committeeResult;
            return(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:C.inp,borderRadius:8,cursor:"pointer"}} onClick={()=>open(r.id)}>
                <div style={{flex:1,fontSize:13,color:C.muted}}>{r.customerName}</div>
                <div style={{fontSize:12,color:C.muted}}>{fmtAmt(r.amount)}</div>
                <StatusBadge status={r.status}/>
                {cv==="rejected_veto"&&<span style={{fontSize:10,color:"#EF4444",fontWeight:700}}>וטו</span>}
                <div style={{fontSize:11,color:C.muted}}>{fmtDate(r.updatedAt)}</div>
              </div>
            );
          })}
        </div>
      </div>}
      {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ══════ AGREEMENT VIEW ═══════════════════
// ══════ ALL STATUS VIEW ══════════════════
function AllStatusView({isMobile}){
  useTheme();
  const T=getT();
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [sortBy,setSortBy]=useState("date"); // date | score | amount | status

  useEffect(()=>{
    dbLoadIdx().then(all=>{
      setRequests(all||[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const STATUS_GROUPS = [
    {key:"all",       label:"הכל",         color:BRAND.navy},
    {key:"active",    label:"פעילות",      color:"#F59E0B"},
    {key:"approved",  label:"אושרו",       color:"#10B981"},
    {key:"rejected",  label:"נדחו",        color:"#EF4444"},
    {key:"agreement", label:"הסכמים",      color:"#A78BFA"},
  ];

  const filtered = requests.filter(r=>{
    const matchSearch = !search || r.customerName?.includes(search) || r.hp?.includes(search) || r.salesPerson?.includes(search);
    if(!matchSearch) return false;
    if(filter==="all") return true;
    if(filter==="active") return ["submitted","in_review","pending_cfo","pending_committee"].includes(r.status);
    if(filter==="approved") return ["approved","conditional"].includes(r.status);
    if(filter==="rejected") return r.status==="rejected";
    if(filter==="agreement") return ["agreement_pending","agreement_sent","agreement_signed"].includes(r.status);
    return true;
  }).sort((a,b)=>{
    if(sortBy==="score") return (b.score||0)-(a.score||0);
    if(sortBy==="amount") return (Number(b.amount)||0)-(Number(a.amount)||0);
    if(sortBy==="status") return (a.status||"").localeCompare(b.status||"");
    return new Date(b.updatedAt||0)-new Date(a.updatedAt||0);
  });

  // Stats summary
  const stats = {
    total: requests.length,
    active: requests.filter(r=>["submitted","in_review","pending_cfo","pending_committee"].includes(r.status)).length,
    approved: requests.filter(r=>["approved","conditional"].includes(r.status)).length,
    rejected: requests.filter(r=>r.status==="rejected").length,
    agreements: requests.filter(r=>["agreement_pending","agreement_sent","agreement_signed"].includes(r.status)).length,
    totalAmount: requests.reduce((s,r)=>s+(Number(r.amount)||0),0),
    approvedAmount: requests.filter(r=>["approved","conditional","agreement_pending","agreement_sent","agreement_signed"].includes(r.status)).reduce((s,r)=>s+(Number(r.amount)||0),0),
  };

  const statusBg={
    submitted:"#8B5CF6",in_review:"#FBBF24",pending_cfo:"#F59E0B",pending_committee:"#F97316",
    approved:"#10B981",conditional:"#06B6D4",rejected:"#EF4444",
    agreement_pending:"#A78BFA",agreement_sent:"#38BDF8",agreement_signed:"#34D399"
  };
  const statusLabel={
    submitted:"ממתינה לסקירה",in_review:"בסקירה",pending_cfo:'ממתינה לסמנכ"ל',
    pending_committee:"בועדה",approved:"אושרה",conditional:"אושרה בתנאים",
    rejected:"נדחתה",agreement_pending:"טרם טופל",agreement_sent:"הסכם נשלח",agreement_signed:"חתום"
  };

  return(
    <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>

      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:900,color:T.text,margin:"0 0 4px"}}>📊 סטטוס כללי — כל הבקשות</h1>
        <p style={{color:T.muted,fontSize:13,margin:0,fontWeight:600}}>תמונת מצב מלאה של מערכת האשראי</p>
      </div>

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"סה\"כ בקשות",value:stats.total,c:BRAND.navy,icon:"📋"},
          {label:"פעילות",value:stats.active,c:"#F59E0B",icon:"⏳"},
          {label:"אושרו",value:stats.approved,c:"#10B981",icon:"✅"},
          {label:"נדחו",value:stats.rejected,c:"#EF4444",icon:"❌"},
          {label:"הסכמים פתוחים",value:stats.agreements,c:"#A78BFA",icon:"📄"},
        ].map((kpi,i)=>(
          <div key={i} style={{padding:"16px 18px",background:T.card,border:`2px solid ${kpi.c}30`,borderRadius:14,boxShadow:T.shadow}}>
            <div style={{fontSize:22,marginBottom:6}}>{kpi.icon}</div>
            <div style={{fontSize:28,fontWeight:900,color:kpi.c,lineHeight:1}}>{kpi.value}</div>
            <div style={{fontSize:12,color:T.muted,fontWeight:700,marginTop:4}}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Amount summary */}
      <div style={{...crd,marginBottom:20,borderColor:BRAND.teal+"40"}}>
        <div style={{display:"flex",gap:32,flexWrap:"wrap",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:T.muted,fontWeight:700,marginBottom:2}}>סה"כ מסגרות שהוגשו</div>
            <div style={{fontSize:22,fontWeight:900,color:T.text}}>${stats.totalAmount.toLocaleString()}</div>
          </div>
          <div style={{width:1,height:36,background:T.cb}}/>
          <div>
            <div style={{fontSize:11,color:T.muted,fontWeight:700,marginBottom:2}}>סה"כ מסגרות שאושרו</div>
            <div style={{fontSize:22,fontWeight:900,color:"#10B981"}}>${stats.approvedAmount.toLocaleString()}</div>
          </div>
          <div style={{width:1,height:36,background:T.cb}}/>
          <div>
            <div style={{fontSize:11,color:T.muted,fontWeight:700,marginBottom:2}}>אחוז אישור</div>
            <div style={{fontSize:22,fontWeight:900,color:BRAND.teal}}>{stats.total?Math.round(((stats.approved+stats.agreements)/stats.total)*100):0}%</div>
          </div>
        </div>
      </div>

      {/* Filters + search */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <div style={{position:"relative",flex:"1 1 200px"}}>
          <input style={{...inp,paddingRight:32}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 חיפוש לפי שם לקוח, ח.פ, איש מכירות..."/>
          {search&&<button style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:14}} onClick={()=>setSearch("")}>✕</button>}
        </div>
        <div style={{display:"flex",gap:6}}>
          {STATUS_GROUPS.map(g=>(
            <button key={g.key} onClick={()=>setFilter(g.key)} style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${filter===g.key?g.color:T.cb}`,background:filter===g.key?g.color+"15":T.inp,color:filter===g.key?g.color:T.muted,fontWeight:filter===g.key?700:600,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {g.label} {g.key!=="all"?`(${requests.filter(r=>{if(g.key==="active")return["submitted","in_review","pending_cfo","pending_committee"].includes(r.status);if(g.key==="approved")return["approved","conditional"].includes(r.status);if(g.key==="rejected")return r.status==="rejected";if(g.key==="agreement")return["agreement_pending","agreement_sent","agreement_signed"].includes(r.status);return true;}).length})` :""}
            </button>
          ))}
        </div>
        <select style={{...inp,width:"auto",cursor:"pointer",paddingRight:8}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="date">מיון: תאריך</option>
          <option value="score">מיון: ציון</option>
          <option value="amount">מיון: סכום</option>
          <option value="status">מיון: סטטוס</option>
        </select>
      </div>

      {/* Table */}
      {loading?(
        <div style={{textAlign:"center",padding:60,color:T.muted}}>⏳ טוען...</div>
      ):filtered.length===0?(
        <div style={{...crd,textAlign:"center",padding:50}}>
          <div style={{fontSize:36,marginBottom:10}}>🔍</div>
          <div style={{color:T.muted,fontWeight:600}}>לא נמצאו בקשות</div>
        </div>
      ):(
        <div style={{...crd,padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:BRAND.navy}}>
                  {["לקוח","ח.פ","מסגרת ($)","תנאי הובלה","ציון","סטטוס","איש מכירות","תאריך עדכון"].map((h,i)=>(
                    <th key={i} style={{padding:"12px 14px",color:"rgba(255,255,255,0.9)",fontWeight:800,borderBottom:`2px solid ${BRAND.teal}`,textAlign:"right",whiteSpace:"nowrap",fontSize:12}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r,i)=>{
                  const sc=r.score||0;
                  const scoreColor=sc>=70?"#10B981":sc>=55?"#FBBF24":sc>=40?"#F97316":"#EF4444";
                  const stColor=statusBg[r.status]||T.muted;
                  return(
                    <tr key={r.id} style={{background:i%2===0?T.card:T.inp,borderBottom:`1px solid ${T.cb}`}}>
                      <td style={{padding:"11px 14px",fontWeight:800,color:T.text}}>{r.customerName||"—"}</td>
                      <td style={{padding:"11px 14px",color:T.muted,fontSize:12}}>{r.hp||"—"}</td>
                      <td style={{padding:"11px 14px",fontWeight:700,color:T.text,whiteSpace:"nowrap"}}>
                        {r.amount?`$${Number(r.amount).toLocaleString()}`:"—"}
                      </td>
                      <td style={{padding:"11px 14px",color:T.muted,fontSize:12}}>{r.paymentTerms||"—"}</td>
                      <td style={{padding:"11px 14px",textAlign:"center"}}>
                        {sc?(
                          <div style={{display:"inline-flex",alignItems:"center",gap:4}}>
                            <div style={{width:32,height:32,borderRadius:"50%",background:scoreColor+"20",border:`2px solid ${scoreColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:scoreColor}}>{sc}</div>
                          </div>
                        ):"—"}
                      </td>
                      <td style={{padding:"11px 14px"}}>
                        <span style={{padding:"3px 10px",borderRadius:20,background:stColor+"20",border:`1px solid ${stColor}50`,fontSize:11,fontWeight:700,color:stColor,whiteSpace:"nowrap"}}>
                          {statusLabel[r.status]||r.status}
                        </span>
                      </td>
                      <td style={{padding:"11px 14px",color:T.muted,fontSize:12}}>{r.salesPerson||"—"}</td>
                      <td style={{padding:"11px 14px",color:T.muted,fontSize:11,whiteSpace:"nowrap"}}>{r.updatedAt?new Date(r.updatedAt).toLocaleDateString("he-IL"):"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:"10px 16px",background:T.inp,borderTop:`1px solid ${T.cb}`,fontSize:12,color:T.muted,fontWeight:600,textAlign:"center"}}>
            {filtered.length} בקשות מוצגות מתוך {requests.length}
          </div>
        </div>
      )}
    </div>
  );
}


const DEFAULT_TEMPLATES = [
  {id:"standard",name:"הסכם אשראי סטנדרטי",text:`הסכם אשראי שילוח
==================
בין: פרידנזון שירותים לוגיסטיים בע"מ ("החברה")
לבין: [שם הלקוח] ח.פ [ח.פ] ("הלקוח")

1. מסגרת אשראי מאושרת: [סכום]
2. תנאי תשלום הובלה: [תנאים]
3. תנאי תשלום מיסים: [תנאים]
4. תוקף ההסכם: 12 חודשים מתאריך חתימה
5. הלקוח מתחייב לעמוד בתנאי התשלום
6. החברה שומרת על זכות לשנות מסגרת בהתראה של 30 יום

חתימת הלקוח: _________________ תאריך: _________
חתימת החברה: _________________ תאריך: _________`},
  {id:"conditional",name:"הסכם אשראי עם תנאים מיוחדים",text:`הסכם אשראי שילוח — עם תנאים
==================
בין: פרידנזון שירותים לוגיסטיים בע"מ ("החברה")
לבין: [שם הלקוח] ח.פ [ח.פ] ("הלקוח")

1. מסגרת אשראי מאושרת: [סכום] — בתנאים
2. תנאי תשלום הובלה: [תנאים]
3. תנאי תשלום מיסים: [תנאים]
4. תנאים מיוחדים:
   א. [תנאי 1]
   ב. [תנאי 2]
5. הפרת תנאי = ביטול מסגרת מידי

חתימת הלקוח: _________________ תאריך: _________
חתימת החברה: _________________ תאריך: _________`},
  {id:"guarantee",name:"הסכם עם ערבות אישית",text:`הסכם אשראי + ערבות אישית
==================
בין: פרידנזון שירותים לוגיסטיים בע"מ ("החברה")
לבין: [שם הלקוח] ח.פ [ח.פ] ("הלקוח")
וערב אישי: [שם הערב] ת.ז [ת.ז] ("הערב")

1. מסגרת אשראי מאושרת: [סכום]
2. תנאי תשלום הובלה: [תנאים]
3. הערב ערב ביחד ולחוד לכל התחייבויות הלקוח
4. במקרה של אי תשלום — ניתן לפנות ישירות לערב

חתימת הלקוח: _________________ תאריך: _________
חתימת הערב:  _________________ תאריך: _________
חתימת החברה: _________________ תאריך: _________`},
];

const TEMPLATES_KEY = "fcm:agreement_templates";

function AgreementView({isMobile}){
  useTheme();
  const T=getT();
  const [tab,setTab]=useState("requests"); // requests | templates
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [current,setCurrent]=useState(null);
  const [agr,setAgr]=useState({status:"agreement_pending",text:"",signedDoc:"",signedDate:"",notes:""});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);

  // Template management
  const [templates,setTemplates]=useState(DEFAULT_TEMPLATES);
  const [editTpl,setEditTpl]=useState(null); // {id,name,text} or null
  const [newTplName,setNewTplName]=useState("");

  useEffect(()=>{
    dbLoadIdx().then(all=>{
      setRequests(all.filter(r=>["approved","conditional","agreement_pending","agreement_sent","agreement_signed"].includes(r.status)));
      setLoading(false);
    }).catch(()=>setLoading(false));
    // Load custom templates
    dbGet(TEMPLATES_KEY).then(saved=>{ if(saved) setTemplates(saved); }).catch(()=>{});
  },[]);

  async function saveTemplates(tpls){
    setTemplates(tpls);
    await dbSet(TEMPLATES_KEY, tpls);
  }

  async function open(id){
    const r=await dbLoadReq(id);
    if(!r)return;
    setCurrent(r);
    setAgr({status:r.status==="approved"||r.status==="conditional"?"agreement_pending":r.status,text:r.agreementText||"",signedDoc:r.agreementSigned||"",signedDate:r.agreementSignedDate||"",notes:r.agreementNotes||""});
  }

  function fillTemplate(tpl){
    const s=current?.sales||{};
    let text=tpl.text;
    text=text.replace(/\[שם הלקוח\]/g,s.customerName||"—");
    text=text.replace(/\[ח\.פ\]/g,s.hp||"—");
    text=text.replace(/\[סכום\]/g,s.requestedAmount?`$${Number(s.requestedAmount).toLocaleString()}`:"—");
    text=text.replace(/\[תנאים הובלה\]/g,s.paymentTermsFreight||s.paymentTerms||"—");
    text=text.replace(/\[תנאים מיסים\]/g,s.paymentTermsTax||"—");
    text=text.replace(/\[תנאים\]/g,s.paymentTermsFreight||s.paymentTerms||"—");
    setAgr(p=>({...p,text}));
  }

  function sendToClient(email,subject){
    if(!email){setToast({m:"לא הוזן מייל לקוח",ok:false});return;}
    sendEmailNotification(email,subject,agr.text);
    setAgr(p=>({...p,status:"agreement_sent"}));
    setToast({m:"📧 מייל נפתח לשליחה — עדכן סטטוס לנשלח",ok:true});
  }

  function sendToSales(settings2,subject){
    const saleEmail=settings2?.users?.find(u=>u.name===current?.sales?.salesPerson)?.email||"";
    if(!saleEmail){setToast({m:"לא נמצא מייל מנהל מכירות",ok:false});return;}
    sendEmailNotification(saleEmail,subject,agr.text);
    setToast({m:"📧 מייל לאיש מכירות נפתח",ok:true});
  }

  async function save(){
    setSaving(true);
    try{
      await dbSaveReq({...current,status:agr.status,agreementText:agr.text,agreementSigned:agr.signedDoc,agreementSignedDate:agr.signedDate,agreementNotes:agr.notes});
      setToast({m:"✅ נשמר",ok:true});
      setCurrent(null);
      dbLoadIdx().then(all=>setRequests(all.filter(r=>["approved","conditional","agreement_pending","agreement_sent","agreement_signed"].includes(r.status))));
    }catch(e){setToast({m:"שגיאה",ok:false});}
    setSaving(false);
  }

  const pendingAgr=requests.filter(r=>["approved","conditional","agreement_pending"].includes(r.status));
  const sentAgr=requests.filter(r=>r.status==="agreement_sent");
  const doneAgr=requests.filter(r=>r.status==="agreement_signed");

  // ─── TEMPLATE MANAGER ────────────────────────
  if(tab==="templates"){
    return(
      <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>📋 תבניות הסכם</h1>
            <p style={{color:T.muted,fontSize:12,margin:"4px 0 0"}}>ניהול תבניות הסכם גנריות</p>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={mkBtn("#475569",true)} onClick={()=>setTab("requests")}>← חזרה לבקשות</button>
            <button style={mkBtn("#10B981")} onClick={()=>setEditTpl({id:"new_"+Date.now(),name:"",text:""})}>+ תבנית חדשה</button>
          </div>
        </div>

        {editTpl&&(
          <div style={{...crd,border:`2px solid ${BRAND.teal}`}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12}}>{editTpl.id.startsWith("new_")?"+ תבנית חדשה":"✏ עריכת תבנית"}</div>
            <Fld label="שם התבנית"><Inp value={editTpl.name} onChange={v=>setEditTpl(p=>({...p,name:v}))} placeholder="הסכם אשראי סטנדרטי"/></Fld>
            <Fld label="תוכן התבנית">
              <textarea style={{...inp,minHeight:300,resize:"vertical",fontFamily:"monospace",fontSize:12,lineHeight:1.8}} value={editTpl.text} onChange={e=>setEditTpl(p=>({...p,text:e.target.value}))} placeholder="כתוב כאן את נוסח ההסכם...
השתמש ב: [שם הלקוח], [ח.פ], [סכום], [תנאים הובלה], [תנאים מיסים]"/>
            </Fld>
            <div style={{fontSize:11,color:T.muted,marginBottom:12}}>💡 מילות מפתח להחלפה אוטומטית: [שם הלקוח], [ח.פ], [סכום], [תנאים הובלה], [תנאים מיסים]</div>
            <div style={{display:"flex",gap:10}}>
              <button style={mkBtn(BRAND.teal)} onClick={async()=>{
                if(!editTpl.name.trim())return;
                const idx=templates.findIndex(t=>t.id===editTpl.id);
                const next=idx>=0?templates.map((t,i)=>i===idx?editTpl:t):[...templates,editTpl];
                await saveTemplates(next);setEditTpl(null);setToast({m:"✅ תבנית נשמרה",ok:true});
              }}>💾 שמור תבנית</button>
              <button style={mkBtn("#475569",false)} onClick={()=>setEditTpl(null)}>ביטול</button>
            </div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:16}}>
          {templates.map(t=>(
            <div key={t.id} style={{...crd,borderColor:BRAND.teal+"40"}}>
              <div style={{fontWeight:700,color:T.text,marginBottom:6}}>{t.name}</div>
              <div style={{fontSize:11,color:T.muted,marginBottom:12,whiteSpace:"pre-wrap",lineHeight:1.6,maxHeight:120,overflow:"hidden"}}>{t.text.slice(0,200)}...</div>
              <div style={{display:"flex",gap:8}}>
                <button style={mkBtn("#1B2E6B",true)} onClick={()=>setEditTpl({...t})}>✏ ערוך</button>
                <button style={mkBtn("#EF4444",true)} onClick={async()=>{await saveTemplates(templates.filter(x=>x.id!==t.id));setToast({m:"✅ נמחק",ok:true});}}>🗑</button>
              </div>
            </div>
          ))}
        </div>
        {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
      </div>
    );
  }

  // ─── REQUEST DETAIL ───────────────────────────
  if(current){
    const s=current.sales||{};
    const clientEmail=s.contactEmail||"";
    return(
      <div style={{maxWidth:1400,margin:"0 auto",padding:isMobile?"12px":"20px",fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>📄 הסכם אשראי</h1>
            <p style={{color:T.muted,fontSize:12,margin:"3px 0 0"}}>{s.customerName} · {s.requestedAmount?`$${Number(s.requestedAmount).toLocaleString()}`:"—"} · {s.paymentTermsFreight||s.paymentTerms||"—"}</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={mkBtn("#334155",false)} onClick={()=>setCurrent(null)}>← חזרה</button>
            <button style={mkBtn("#475569",true,saving)} onClick={save} disabled={saving}>💾 שמור</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>
          <div>
            {/* Decision summary */}
            <div style={{...crd,borderColor:BRAND.teal+"60"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><div style={lbl}>לקוח</div><div style={{fontWeight:700,color:T.text}}>{s.customerName}</div><div style={{fontSize:11,color:T.muted}}>{s.hp}</div></div>
                <div><div style={lbl}>מסגרת</div><div style={{fontWeight:800,fontSize:15,color:"#10B981"}}>{s.requestedAmount?`$${Number(s.requestedAmount).toLocaleString()}`:"—"}</div></div>
                <div><div style={lbl}>הובלה</div><div style={{fontSize:12,color:T.text}}>{s.paymentTermsFreight||s.paymentTerms||"—"}</div></div>
                <div><div style={lbl}>מיסים</div><div style={{fontSize:12,color:T.text}}>{s.paymentTermsTax||"—"}</div></div>
                <div><div style={lbl}>מייל לקוח</div><div style={{fontSize:11,color:clientEmail?BRAND.teal:T.muted}}>{clientEmail||"לא הוזן"}</div></div>
                <div><div style={lbl}>ציון</div><div style={{fontWeight:700,color:current.rec?.c||T.text}}>{current.score?.norm||"—"}/100</div></div>
              </div>
              {current.approval?.conditions&&<div style={{marginTop:10,padding:"8px 12px",background:T.inp,borderRadius:8,fontSize:12,color:BRAND.teal}}>📋 תנאי אישור: {current.approval.conditions}</div>}
            </div>

            {/* Status + send */}
            <div style={crd}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📊 סטטוס הסכם</div>
              <Rg options={AGR_STATUSES.map(a=>({l:a.l,v:a.v}))} value={agr.status} onChange={v=>setAgr(p=>({...p,status:v}))}/>
              {agr.status==="agreement_signed"&&(
                <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Fld label="תאריך חתימה"><Inp value={agr.signedDate} onChange={v=>setAgr(p=>({...p,signedDate:v}))} type="date"/></Fld>
                </div>
              )}
              <div style={{marginTop:14,display:"flex",gap:8,flexWrap:"wrap"}}>
                <button style={mkBtn(BRAND.teal,false,!clientEmail)} disabled={!clientEmail} onClick={()=>sendToClient(clientEmail,`הסכם אשראי — ${s.customerName}`)}>📧 שלח ללקוח {clientEmail?`(${clientEmail})`:""}</button>
                <button style={mkBtn("#8B5CF6")} onClick={async()=>{const st=await dbLoadSettings();sendToSales(st,`הסכם אשראי לחתימה — ${s.customerName}`);}}>📧 שלח לאיש מכירות</button>
              </div>
            </div>

            {/* Signed doc */}
            <div style={{...crd,borderColor:"#34D39940"}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>🖊️ הסכם חתום — תיוק</div>
              <textarea style={{...inp,minHeight:100,resize:"vertical",fontFamily:"monospace",fontSize:12}} value={agr.signedDoc} onChange={e=>setAgr(p=>({...p,signedDoc:e.target.value}))} placeholder="הדבק תוכן הסכם חתום / אסמכתא / קישור..."/>
              {agr.signedDoc&&<div style={{marginTop:6,padding:"5px 10px",background:"#022c22",border:"1px solid #34D39950",borderRadius:6,fontSize:11,color:"#34D399"}}>✅ {agr.signedDoc.length} תווים</div>}
              <Fld label="הערות"><Ta value={agr.notes} onChange={v=>setAgr(p=>({...p,notes:v}))} placeholder="הערות..."/></Fld>
            </div>
          </div>

          <div>
            {/* Template selector */}
            <div style={crd}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>📋 בחר תבנית</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                {templates.map(t=>(
                  <button key={t.id} style={{...mkBtn("#1B2E6B"),justifyContent:"flex-start",textAlign:"right"}} onClick={()=>fillTemplate(t)}>📄 {t.name}</button>
                ))}
              </div>
              <button style={mkBtn("#475569",true)} onClick={()=>{setTab("templates");setCurrent(null);}}>⚙️ ערוך תבניות</button>
            </div>

            {/* Agreement text */}
            <div style={crd}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>✍ נוסח ההסכם</div>
              <textarea style={{...inp,minHeight:400,resize:"vertical",fontFamily:"monospace",fontSize:12,lineHeight:1.8}} value={agr.text} onChange={e=>setAgr(p=>({...p,text:e.target.value}))} placeholder="בחר תבנית למעלה או כתוב כאן..."/>
              {agr.text&&(
                <button style={{...mkBtn("#00B4C8",true),marginTop:8}} onClick={()=>{const b=new Blob([agr.text],{type:"text/plain;charset=utf-8"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`agreement_${s.customerName||"client"}_${new Date().toISOString().slice(0,10)}.txt`;a.click();URL.revokeObjectURL(u);}}>
                  ⬇️ הורד כקובץ
                </button>
              )}
            </div>
          </div>
        </div>
        {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────
  const Section=({title,color,items})=>items.length===0?null:(
    <div style={{...crd,border:`1px solid ${color}50`}}>
      <div style={{fontSize:14,fontWeight:700,color,marginBottom:12}}>{title} ({items.length})</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {items.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:T.inp,borderRadius:10,cursor:"pointer",border:`1px solid ${color}30`}} onClick={()=>open(r.id)}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:T.text,marginBottom:2}}>{r.customerName}</div>
              <div style={{fontSize:12,color:T.muted}}>{r.amount?`$${Number(r.amount).toLocaleString()}`:"—"} · {r.paymentTerms||"—"} · {new Date(r.updatedAt).toLocaleDateString("he-IL")}</div>
            </div>
            <StatusBadge status={r.status}/>
            <button style={mkBtn(color,true)}>פתח ›</button>
          </div>
        ))}
      </div>
    </div>
  );

  return(
    <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
      <div style={{marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>📄 הסכמי אשראי — מעקב וטיפול</h1>
          <p style={{color:T.muted,fontSize:12,margin:"3px 0 0"}}>בקשות שאושרו — טיוב הסכם, שליחה ותיוק</p>
        </div>
        <button style={mkBtn("#1B2E6B")} onClick={()=>setTab("templates")}>📋 תבניות הסכם</button>
      </div>
      {loading?<div style={{textAlign:"center",padding:40,color:T.muted}}>⏳</div>:(
        <>
          <Section title="📄 ממתין לטיפול" color="#A78BFA" items={pendingAgr}/>
          <Section title="✉️ נשלח — ממתין לחתימה" color="#38BDF8" items={sentAgr}/>
          <Section title="🖊️ הסכמים חתומים" color="#34D399" items={doneAgr}/>
          {requests.length===0&&<div style={{...crd,textAlign:"center",padding:50}}><div style={{fontSize:40,marginBottom:10}}>✅</div><div style={{color:T.muted}}>אין בקשות שאושרו עדיין</div></div>}
        </>
      )}
      {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
    </div>
  );
}



// ══════ ADMIN VIEW ════════════════════════
function AdminView({onSettingsSaved}){
  useTheme();
  const T=getT();
  const [settings,setSettings]=useState({salesReps:[],users:[],cfoLimit:CFO_LIMIT});
  const [tab,setTab]=useState("users");
  const [loading,setLoading]=useState(true);
  const [saved,setSaved]=useState(false);
  const [toast,setToast]=useState(null);
  const [newUser,setNewUser]=useState({name:"",username:"",password:"",role:"sales",jobTitle:"",email:""});
  const [showPass,setShowPass]=useState(false);
  const [cred,setCred]=useState(null);
  const [editingUserId,setEditingUserId]=useState(null);
  const [editForm,setEditForm]=useState({name:"",username:"",password:"",role:"sales",email:""});

  useEffect(()=>{
    dbLoadSettings().then(s=>{setSettings({salesReps:[],users:[],...(s||{})});setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  function genPwd(){const ch="abcdefghjkmnpqrstuvwxyz23456789";return Array.from({length:8},()=>ch[Math.floor(Math.random()*ch.length)]).join("");}
  function handleNameChange(name){const slug=name.trim().toLowerCase().replace(/\s+/g,".")+String(Math.floor(Math.random()*90)+10);setNewUser(p=>({...p,name,username:slug,password:genPwd()}));}

  async function addUser(){
    const {name,username,password,role,jobTitle,email}=newUser;
    if(!name.trim()||!username.trim()||!password.trim()){setToast({m:"מלא שם, שם משתמש וסיסמה",ok:false});return;}
    const user={id:Date.now(),name,username,password,role,jobTitle,email};
    const reps=role==="sales"?[...(settings.salesReps||[]),{name,role:jobTitle||"מנהל מכירות",id:user.id}]:(settings.salesReps||[]);
    const next={...settings,users:[...(settings.users||[]),user],salesReps:reps};
    await dbSaveSettings(next);setSettings(next);if(onSettingsSaved)onSettingsSaved();
    setCred({name,username,password,role,email});
    setNewUser({name:"",username:"",password:"",role:"sales",jobTitle:"",email:""});
    setSaved(true);setTimeout(()=>setSaved(false),2500);
  }
  async function removeUser(id){
    const next={...settings,users:(settings.users||[]).filter(u=>u.id!==id),salesReps:(settings.salesReps||[]).filter(r=>r.id!==id)};
    await dbSaveSettings(next);setSettings(next);if(onSettingsSaved)onSettingsSaved();
  }
  async function saveUserEdit(origUser){
    const updated={...origUser,...editForm,password:editForm.password||origUser.password};
    const reps=(settings.salesReps||[]).map(r=>r.id===origUser.id?{...r,name:updated.name}:r);
    const next={...settings,users:(settings.users||[]).map(x=>x.id===origUser.id?updated:x),salesReps:reps};
    await dbSaveSettings(next);setSettings(next);if(onSettingsSaved)onSettingsSaved();
    setEditingUserId(null);setToast({m:"✅ משתמש עודכן",ok:true});
  }
  function resetRequests(){
    if(!window.confirm("מחק את כל הבקשות?"))return;
    const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(k.includes(':req:')||k.includes(':idx')))keys.push(k);}
    keys.forEach(k=>localStorage.removeItem(k));setToast({m:"✅ כל הבקשות נמחקו",ok:true});
  }
  function resetAll(){
    if(!window.confirm("מחק הכל ואתחל מחדש?"))return;
    const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('fcm_'))keys.push(k);}
    keys.forEach(k=>localStorage.removeItem(k));alert("המערכת אותחלה. הדף יטען מחדש.");window.location.reload();
  }

  const RL={sales:"מנהל מכירות",referent:"רפרנטית אשראי",cfo:'סמנכ"ל כספים'};
  const RC={sales:"#3B82F6",referent:"#8B5CF6",cfo:BRAND.teal};
  const tabBtn=(k,label)=>(<button onClick={()=>setTab(k)} style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",background:tab===k?BRAND.navy:T.inp,color:tab===k?"#fff":T.muted,transition:"all 0.15s"}}>{label}</button>);

  if(loading)return(<div style={{textAlign:"center",padding:60,color:T.muted,direction:"rtl"}}>⏳ טוען...</div>);

  return(
    <div style={{maxWidth:1400,margin:"0 auto",padding:20,fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl"}}>
      <div style={{marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>⚙️ מנהל מערכת</h1>
          <p style={{color:T.muted,fontSize:12,margin:"4px 0 0"}}>ניהול משתמשים והגדרות</p>
        </div>
        {saved&&<div style={{padding:"6px 14px",background:"#022c22",border:"1px solid #10B981",borderRadius:8,fontSize:12,color:"#10B981",fontWeight:600}}>✅ נשמר</div>}
      </div>
      <div style={{marginBottom:20,display:"flex",gap:8,flexWrap:"wrap"}}>
        {tabBtn("users","👥 משתמשים")}
        {tabBtn("settings","⚙️ הגדרות")}
        {tabBtn("bdi","📊 BDI")}
        {tabBtn("reset","🔄 אתחול")}
      </div>

      {tab==="users"&&<>
        <div style={{...crd,borderColor:BRAND.teal+"60"}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>👥 משתמשים ({(settings.users||[]).length})</div>
          {!(settings.users||[]).length&&<div style={{color:T.muted,fontSize:13,textAlign:"center",padding:20}}>אין משתמשים — הוסף למטה</div>}
          {(settings.users||[]).map(u=>{
            const isEditing=editingUserId===u.id;
            return(
              <div key={u.id} style={{marginBottom:10,padding:14,background:isEditing?T.infoBox:T.inp,borderRadius:12,border:`1px solid ${isEditing?BRAND.teal:T.cb}`}}>
                {!isEditing?(
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,color:T.text,fontSize:14}}>{u.name}</div>
                      <div style={{fontSize:12,color:T.muted,marginTop:2}}>{u.username} · {RL[u.role]||u.role}{u.email?" · "+u.email:""}</div>
                    </div>
                    <div style={{fontSize:11,padding:"3px 10px",borderRadius:12,background:(RC[u.role]||"#64748B")+"20",color:RC[u.role]||"#64748B",fontWeight:700}}>{RL[u.role]}</div>
                    <button style={mkBtn("#1B2E6B",true)} onClick={()=>{setEditingUserId(u.id);setEditForm({name:u.name||"",username:u.username||"",password:"",role:u.role||"sales",email:u.email||""});}}>✏ ערוך</button>
                    <button style={mkBtn("#EF4444",true)} onClick={()=>removeUser(u.id)}>🗑 הסר</button>
                  </div>
                ):(
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:BRAND.teal,marginBottom:12}}>✏ עריכת: {u.name}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                      <Fld label="שם מלא"><Inp value={editForm.name} onChange={v=>setEditForm(p=>({...p,name:v}))} placeholder="ישראל ישראלי"/></Fld>
                      <Fld label="שם משתמש"><Inp value={editForm.username} onChange={v=>setEditForm(p=>({...p,username:v}))} placeholder="israel.i"/></Fld>
                      <Fld label="תפקיד">
                        <select style={sel} value={editForm.role} onChange={e=>setEditForm(p=>({...p,role:e.target.value}))}>
                          <option value="sales">👤 מנהל מכירות</option>
                          <option value="referent">🔍 רפרנטית אשראי</option>
                          <option value="cfo">💼 סמנכ"ל כספים</option>
                        </select>
                      </Fld>
                      <Fld label="סיסמה חדשה (ריק=ללא שינוי)"><Inp value={editForm.password} onChange={v=>setEditForm(p=>({...p,password:v}))} placeholder="••••••••" type="password"/></Fld>
                      <Fld label="אימייל"><Inp value={editForm.email} onChange={v=>setEditForm(p=>({...p,email:v}))} placeholder="user@fridenson.com" type="email"/></Fld>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button style={mkBtn("#10B981")} onClick={()=>saveUserEdit(u)}>💾 שמור שינויים</button>
                      <button style={mkBtn("#475569",false)} onClick={()=>setEditingUserId(null)}>ביטול</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={crd}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>+ הוסף משתמש חדש</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
            <Fld label="שם מלא *"><Inp value={newUser.name} onChange={handleNameChange} placeholder="ישראל ישראלי"/></Fld>
            <Fld label="תפקיד">
              <select style={sel} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                <option value="sales">👤 מנהל מכירות</option>
                <option value="referent">🔍 רפרנטית אשראי</option>
                <option value="cfo">💼 סמנכ"ל כספים</option>
              </select>
            </Fld>
            <Fld label="שם משתמש *"><Inp value={newUser.username} onChange={v=>setNewUser(p=>({...p,username:v}))} placeholder="israel.i"/></Fld>
            <Fld label="סיסמה *">
              <div style={{position:"relative"}}>
                <input style={{...inp,paddingLeft:36}} type={showPass?"text":"password"} value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))}/>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",cursor:"pointer",color:T.muted,fontSize:14}} onClick={()=>setShowPass(p=>!p)}>{showPass?"👁":"👁‍🗨"}</span>
              </div>
            </Fld>
            <Fld label="אימייל (לקבלת התראות)"><Inp value={newUser.email} onChange={v=>setNewUser(p=>({...p,email:v}))} placeholder="user@fridenson.com" type="email"/></Fld>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button style={mkBtn("#10B981")} onClick={addUser}>+ הוסף</button>
          </div>
          {cred&&(
            <div style={{marginTop:14,padding:14,background:"#022c22",border:"1px solid #10B981",borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:700,color:"#10B981",marginBottom:8}}>✅ משתמש נוסף — שמור:</div>
              <div style={{fontFamily:"monospace",fontSize:12,color:"#A7F3D0",lineHeight:1.9}}>שם משתמש: <strong>{cred.username}</strong><br/>סיסמה: <strong>{cred.password}</strong><br/>תפקיד: {RL[cred.role]}{cred.email&&<span><br/>{"מייל: "+cred.email}</span>}</div>
            </div>
          )}
        </div>
      </>}

      {tab==="settings"&&(
        <div style={crd}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>⚙️ הגדרות</div>
          <Fld label={'סף אישור סמנכ"ל ($)'}>
            <div style={{display:"flex",gap:10}}>
              <Inp value={String(settings.cfoLimit||CFO_LIMIT)} onChange={v=>setSettings(p=>({...p,cfoLimit:Number(v)||CFO_LIMIT}))} type="number"/>
              <button style={mkBtn(BRAND.teal)} onClick={async()=>{await dbSaveSettings(settings);if(onSettingsSaved)onSettingsSaved();setSaved(true);setTimeout(()=>setSaved(false),2000);}}>💾 שמור</button>
            </div>
          </Fld>
          <div style={{fontSize:12,color:T.muted,marginTop:4}}>בקשות מעל סכום זה → ועדת אשראי</div>
        </div>
      )}

      {tab==="bdi"&&(
        <div style={crd}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12}}>📊 חיבור BDI — Claude Code CLI</div>
          <div style={{padding:"12px 14px",background:T.inp,border:`1px solid ${T.cb}`,borderRadius:8,fontSize:12,color:T.muted,lineHeight:1.8}}>
            להפעלת שליפת BDI אוטומטית:<br/>
            1. כנס ל-bdi.co.il (שם משתמש + סיסמה + ת.ז)<br/>
            2. בטופס הרפרנטית — הזן פרטי כניסה ב-BDI Section → לחץ "הצג הוראות"<br/>
            3. הרץ <code style={{background:T.card,padding:"1px 6px",borderRadius:4}}>claude</code> ב-Terminal → הדבק את הפקודה<br/>
            4. העתק תוצאת JSON לשדה "תוכן דוח BDI"
          </div>
        </div>
      )}

      {tab==="reset"&&(
        <div style={{...crd,border:"2px solid #EF4444"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#EF4444",marginBottom:12}}>⚠️ אזור מסוכן</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{padding:14,background:T.inp,borderRadius:10,border:`1px solid ${T.cb}`}}>
              <div style={{fontWeight:700,color:T.text,marginBottom:4}}>🗑 מחק בקשות בלבד</div>
              <div style={{fontSize:12,color:T.muted,marginBottom:10}}>המשתמשים נשמרים</div>
              <button style={mkBtn("#EF4444")} onClick={resetRequests}>מחק בקשות</button>
            </div>
            <div style={{padding:14,background:"#FEF2F2",border:"2px solid #EF4444",borderRadius:10}}>
              <div style={{fontWeight:700,color:"#EF4444",marginBottom:4}}>🔄 אתחל מערכת לחלוטין</div>
              <div style={{fontSize:12,color:"#B91C1C",marginBottom:10}}>מוחק הכל — הדף יטען מחדש</div>
              <button style={mkBtn("#7F1D1D")} onClick={resetAll}>אתחל הכל</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
    </div>
  );
}


// ══════ APP VERSION & RESET ══════════════
const APP_VERSION = "v2.1";
function clearAllAppData(){
  const keys=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('fcm_'))keys.push(k);}
  keys.forEach(k=>localStorage.removeItem(k));
}
try{
  const sv=localStorage.getItem('fcm_version');
  if(sv!==APP_VERSION){clearAllAppData();localStorage.setItem('fcm_version',APP_VERSION);}
}catch(e){}

// ══════ APP ═══════════════════════════════
function App(){
  const [currentUser,setCurrentUser]=useState(null);
  const [settings,setSettings]=useState({salesReps:[],users:[],cfoLimit:CFO_LIMIT});
  const [view,setView]=useState("main");
  const [toast,setToast]=useState(null);
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem("fcm_theme")||"light";}catch{return "light";}});
  const [forceMobile,setForceMobile]=useState(()=>{try{return localStorage.getItem("fcm_forceMobile")==="1";}catch{return false;}});
  const [pendingCounts,setPendingCounts]=useState({referent:0,cfo:0,committee:0,agreements:0});
  const isMobile=useIsMobile();
  const effectiveMobile=forceMobile;
  useTheme(theme);

  function toggleTheme(){const n=theme==="dark"?"light":"dark";setTheme(n);try{localStorage.setItem("fcm_theme",n);}catch{}}
  function toggleMobileView(){const n=!forceMobile;setForceMobile(n);try{localStorage.setItem("fcm_forceMobile",n?"1":"0");}catch{}}

  const refreshSettings=useCallback(async()=>{
    const s=await dbLoadSettings();
    setSettings({salesReps:[],users:[],cfoLimit:CFO_LIMIT,...(s||{})});
    try{
      const idx=await dbLoadIdx();
      setPendingCounts({
        referent:idx.filter(r=>["submitted","in_review"].includes(r.status)).length,
        cfo:idx.filter(r=>r.status==="pending_cfo").length,
        committee:idx.filter(r=>r.status==="pending_committee").length,
        agreements:idx.filter(r=>["approved","conditional","agreement_pending","agreement_sent"].includes(r.status)).length,
      });
    }catch(e){}
  },[]);

  useEffect(()=>{refreshSettings();},[]);

  function handleLogin(user){
    setCurrentUser(user);
    if(user.role==="sales") setView("sales");
    else if(user.role==="referent") setView("referent");
    else if(user.role==="cfo") setView("cfo");
    else setView("referent");
  }
  function handleLogout(){setCurrentUser(null);setView("main");}

  if(!currentUser){
    return(<LoginScreen settings={settings} onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme}/>);
  }

  const isSales=currentUser.role==="sales";
  const isAdmin=currentUser.isAdmin;
  const canSeeAll=currentUser.canSeeAll;
  const tabs=[];
  if(isSales){
    tabs.push({key:"sales",label:"📋 הבקשות שלי"});
  } else {
    tabs.push({key:"referent",label:"🔍 סקירת אשראי"});
    if(currentUser.role==="referent"){
      tabs.push({key:"allstatus",label:"📊 סטטוס כללי"});
      tabs.push({key:"agreements",label:"📄 הסכמי אשראי"});
    }
    if(currentUser.role==="cfo"||currentUser.role==="referent"){
      tabs.push({key:"cfo",label:'💼 אישורי סמנכ"ל'});
      tabs.push({key:"committee",label:"⚖️ ועדת אשראי"});
    }
    if(isAdmin) tabs.push({key:"admin",label:"⚙️ מנהל מערכת"});
  }
  tabs.push({key:"guide",label:"🗺️ מדריך"});

  return(
    <div style={{fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif",direction:"rtl",minHeight:"100vh",background:getT().bg,color:getT().text,transition:"background 0.3s,color 0.3s",paddingBottom:effectiveMobile?"80px":"0"}}>
      <Header user={currentUser} onLogout={handleLogout} activeView={view} setView={setView} tabs={tabs} isMobile={effectiveMobile} theme={theme} onToggleTheme={toggleTheme} onToggleMobile={toggleMobileView} forceMobile={forceMobile} pendingCounts={pendingCounts}/>
      {view==="sales"&&<ErrorBoundary><SalesView settings={settings} currentUser={currentUser} isMobile={effectiveMobile}/></ErrorBoundary>}
      {view==="referent"&&canSeeAll&&<ErrorBoundary><ReferentView isMobile={effectiveMobile}/></ErrorBoundary>}
      {view==="allstatus"&&canSeeAll&&<ErrorBoundary><AllStatusView isMobile={effectiveMobile}/></ErrorBoundary>}
      {view==="agreements"&&canSeeAll&&<ErrorBoundary><AgreementView isMobile={effectiveMobile}/></ErrorBoundary>}
      {view==="cfo"&&canSeeAll&&<ErrorBoundary><ApprovalView role="cfo" currentUser={currentUser} isMobile={effectiveMobile}/></ErrorBoundary>}
      {view==="committee"&&canSeeAll&&<ErrorBoundary><ApprovalView role="committee" currentUser={currentUser} isMobile={effectiveMobile}/></ErrorBoundary>}
      {view==="admin"&&isAdmin&&<ErrorBoundary><AdminView onSettingsSaved={refreshSettings}/></ErrorBoundary>}
      {view==="guide"&&<ErrorBoundary><WorkflowGuide isMobile={effectiveMobile}/></ErrorBoundary>}
      {toast&&<Toast msg={toast.m} ok={toast.ok} onDone={()=>setToast(null)}/>}
    </div>
  );
}


ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));