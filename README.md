# Fridenson Credit Management System
### מערכת ניהול אשראי שילוח — פרידנזון שירותים לוגיסטיים

---

## סקירה כללית

מערכת לניהול תהליך אישור אשראי לקוחות בחטיבת שילוח בינלאומי. כוללת:

- **ניהול בקשות אשראי** — מנהלי מכירות, רפרנטית, סמנכ"ל, ועדה
- **מודל ניקוד BDI** — 9 קטגוריות, 105 נקודות מנורמלות ל-100
- **ועדת אשראי** עם מנגנון וטו כפול
- **ניהול הסכמים** עם תבניות גנריות
- **התראות מייל** אוטומטיות בכל מעבר שלב
- **דשבורד סטטוס כללי** עם KPIs

---

## מבנה הפרויקט

```
fridenson-credit-management/
├── frontend/              # React 18 + Vite
│   ├── src/
│   │   ├── App.jsx        # קוד מקורי מלא (~2,500 שורות)
│   │   └── main.jsx       # נקודת כניסה
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/               # Node.js + Express + SQLite
│   ├── server.js
│   └── package.json
├── dist/                  # קבצים מוכנים להפצה
│   ├── freight-credit.html         # גרסה רגילה (standalone)
│   └── freight-credit-premium.html # גרסה Obsidian Executive (standalone)
├── scripts/
│   └── build-standalone.js  # בונה HTML עצמאי מ-App.jsx
├── .github/workflows/
│   └── build.yml            # CI אוטומטי
├── .gitignore
└── package.json
```

---

## הפעלה מהירה

### אפשרות א׳ — קובץ HTML עצמאי (ללא שרת)

```bash
# פשוט פתח בדפדפן:
dist/freight-credit.html          # עיצוב רגיל
dist/freight-credit-premium.html  # עיצוב Obsidian Executive
```

> **מגבלה:** נתונים נשמרים ב-localStorage של הדפדפן — מקומיים בלבד.

---

### אפשרות ב׳ — שרת עם בסיס נתונים משותף

```bash
# 1. התקן תלויות
npm run install:all

# 2. הפעל (Backend + Frontend)
npm run dev

# גישה:
#   Frontend: http://localhost:5173
#   Backend:  http://localhost:3000
```

---

### אפשרות ג׳ — Docker

```bash
docker-compose up -d
# גישה: http://localhost:3000
```

---

## בניית גרסה עצמאית

```bash
# בונה dist/freight-credit.html חדש מהקוד המקורי
node scripts/build-standalone.js
```

---

## כניסה ראשונה

| שם משתמש | סיסמה | תפקיד |
|---|---|---|
| `admin` | `admin123` | מנהל מערכת (רפרנטית) |

> ⚠ צור משתמשים דרך ⚙️ מנהל מערכת לפני הפצה לצוות.

---

## תפקידים במערכת

| תפקיד | `role` | גישה |
|---|---|---|
| מנהל מכירות | `sales` | בקשות שלו בלבד |
| רפרנטית אשראי | `referent` | כל הלשוניות + מנהל מערכת |
| סמנכ"ל כספים | `cfo` | אישורים + ועדה |

---

## מודל הניקוד

| # | קטגוריה | משקל |
|---|---|---|
| 1 | דירוג BDI (1–10) | 30 נק׳ |
| 2 | ביטוח כלל | 30 נק׳ |
| 3 | היסטוריית תשלומים | 15 נק׳ |
| 4 | פרופיל עסקי | 10 נק׳ |
| 5 | יחסים פיננסיים | 8 נק׳ |
| 6 | סוג חשיפה | 3 נק׳ |
| 7 | תנאי תשלום | 3 נק׳ |
| 8 | גובה האשראי | 3 נק׳ |
| 9 | סינרגיה | 3 נק׳ |
| | **סה"כ** | **105 → מנורמל ל-100** |

---

## ועדת אשראי

| חבר | וטו |
|---|---|
| 💼 סמנכ"ל כספים | ✗ |
| 🚢 מנכ"ל שילוח | ✗ |
| 🏢 מנכ"ל פרידנזון | ✅ **וטו כפול** |

**וטו כפול:** דחייה → דוחה הכל · אישור → גובר על חבר אחד דוחה

---

## Backup

```bash
# SQLite database
backend/data/freight.db

# גבה יומית עם cron:
0 2 * * * cp /path/to/freight.db /backups/freight-$(date +%Y%m%d).db
```

---

## Stack טכנולוגי

| שכבה | טכנולוגיה |
|---|---|
| Frontend | React 18, Vite, JSX |
| Backend | Node.js, Express |
| DB | SQLite (better-sqlite3) |
| Standalone | Babel CLI, React UMD |
| Design | Inline styles + CSS vars |
| Premium Design | Syne + DM Sans + JetBrains Mono |

---

*פרידנזון שירותים לוגיסטיים בע"מ · v2.1 · 2025*
