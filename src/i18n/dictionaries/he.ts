/**
 * Hebrew is the source dictionary: its shape defines the Dictionary type that English and
 * Russian are checked against, so a missing or misspelled key fails the type build.
 */

/**
 * CLDR gives each language a different set of plural categories — Hebrew uses one/two/many,
 * Russian one/few/many, English only one — so every category but "other" is optional and
 * the annotation keeps a language from being locked into Hebrew's set.
 */
export type PluralForms = {
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

export const plural = (forms: PluralForms): PluralForms => forms;

const dictionary = {
  app: {
    title: "סייר תוצאות הבחירות בישראל",
    eyebrow: "תוצאות הכנסת ברמת יישוב · 2019–2022",
    skipLink: "דילוג לסייר הבחירות",
    preparing: "מכין את נתוני הבחירות",
    rootMissing: "רכיב השורש של היישום חסר.",
  },
  header: {
    sources: "מקורות נתונים רשמיים",
    officialResults: "תוצאות רשמיות",
    downloadCsv: "הורדת CSV ברמת יישוב",
    locale: "שפת הממשק",
    theme: "ערכת נושא לממשק ולמפה",
  },
  themes: {
    light: "בהיר",
    dark: "כהה",
  },
  footer: {
    finalResults: "תוצאות סופיות:",
    committee: "ועדת הבחירות המרכזית",
    localityCsv: "CSV ברמת יישוב",
    map: "מפה:",
    and: "ו-",
  },
  panel: {
    controls: "בקרות בחירות וניתוח יישובים",
    table: "טבלת יישובים",
    explore: "חקירת תוצאות",
    hide: "הסתרה",
    show: "הצגה",
  },
  modes: {
    label: "תצוגת ניתוח",
    explore: "חקירה",
    compare: "השוואה",
    table: "טבלה",
  },
  controls: {
    election: "מערכת בחירות",
    /** Resolved with ordinal plural rules, which English needs for 21st/22nd/23rd/25th. */
    knesset: plural({ other: "הבחירות לכנסת ה־{{ count }}" }),
    party: "רשימה",
    chooseParty: "בחירת רשימה",
    comparisonTitle: "השוואה עצמאית",
    comparisonNote: "א' ו־ב' הן רשימות היסטוריות נפרדות. ההשוואה אינה טוענת לרציפות מפלגתית.",
    electionB: "מערכת בחירות ב'",
    listB: "רשימה ב'",
    loadingComparison: "טוען נתוני השוואה…",
  },
  explore: {
    chooseParty: "בחירת רשימה",
    choosePartyHint: "בחרו רשימה כדי לצבוע את המפה ולראות את תוצאותיה ביישובים.",
    nationalShare: "שיעור ארצי",
    strongestLocality: "היישוב החזק ביותר",
    mappedLocalities: "יישובים ממופים",
    findLocality: "חיפוש יישוב",
    searchPlaceholder: "חיפוש בעברית או באנגלית",
    selectLocality: "בחירת יישוב",
    selectLocalityHint: "בחרו אזור במפה או חפשו לפי שם.",
  },
  table: {
    title: "טבלת יישובים",
    filterLabel: "סינון יישובים בטבלה",
    filterPlaceholder: "סינון לפי שם יישוב",
    minTurnout: "אחוז הצבעה מזערי",
    minShare: "שיעור מזערי",
    minValid: "קולות כשרים מזעריים",
    count: plural({
      one: "יישוב ממופה אחד",
      two: "שני יישובים ממופים",
      many: "{{ count }} יישובים ממופים",
      other: "{{ count }} יישובים ממופים",
    }),
    locality: "יישוב",
    votes: "קולות",
    share: "שיעור",
    turnout: "אחוז הצבעה",
    valid: "כשרים",
    rank: "דירוג",
    delta: "Δ נק' אחוז",
    noData: "אין נתונים",
  },
  details: {
    selected: "היישוב הנבחר",
    rank: "דירוג {{ rank }}",
    votes: plural({
      one: "קול אחד לרשימה הנבחרת",
      two: "שני קולות לרשימה הנבחרת",
      many: "{{ count }} קולות לרשימה הנבחרת",
      other: "{{ count }} קולות לרשימה הנבחרת",
    }),
    turnout: "אחוז הצבעה",
    validBallots: "קולות כשרים",
    breakdown: "פילוח רשימות",
  },
  comparison: {
    title: "השוואת יישוב עצמאית א' / ב'",
    singleElection: "היישוב קיים במערכת בחירות אחת בלבד, ולכן לא ניתן לחשב שינוי.",
    change: "שינוי",
    noData: "אין נתונים",
    first: "א'",
    second: "ב'",
  },
  exports: {
    copyLink: "העתקת קישור",
    csv: "CSV",
    png: "PNG",
  },
  legend: {
    label: "מקרא צבעי המפה",
    comparisonTitle: "שיעור ב' פחות שיעור א'",
    shareTitle: "שיעור הקולות לרשימה",
    negative: "‎-100 נק' (א')",
    zero: "0 נק'",
    positive: "‎+100 נק' (ב')",
    lower: "נמוך",
    higher: "גבוה",
    noData: "אפור: אין נתונים תואמים",
  },
  map: {
    region: "מפת תוצאות הבחירות",
    interactive: "מפת תוצאות יישובית אינטראקטיבית",
    comparisonError: "תוצאות ההשוואה אינן זמינות. נסו שוב כדי לשחזר את מפת ההשוואה.",
    comparisonLoading: "טוען תוצאות השוואה…",
    resultsError: "תוצאות מערכת הבחירות שנבחרה אינן זמינות. נסו שוב כדי לשחזר את המפה.",
    boundariesLoading: "טוען גבולות מפה…",
  },
  status: {
    unknownError: "משהו השתבש בטעינת הסייר.",
    loadFailed: "לא ניתן לטעון את הנתונים",
    retry: "ניסיון נוסף",
    loadingResults: "טוען תוצאות יישוביות…",
  },
  dataError: {
    http: "לא ניתן לטעון נתונים ({{ status }}).",
    aborted: "בקשת התוצאות בוטלה.",
    manifestInvalid: "מפרט הבחירות אינו תקין.",
    resultsInvalid: "קובץ תוצאות הבחירות אינו תקין.",
    electionMismatch: "קובץ התוצאות אינו תואם למערכת הבחירות שנבחרה.",
    comparisonMismatch: "קובץ ההשוואה אינו תואם למערכת הבחירות שנבחרה.",
  },
  actions: {
    clipboardUnavailable: "הלוח אינו זמין.",
    linkCopied: "קישור הניתוח הועתק ללוח.",
    copyFromAddressBar: "העתיקו את קישור הניתוח משורת הכתובת של הדפדפן.",
    csvStarted: "הורדת ה־CSV החלה.",
    csvFailed: "ייצוא ה־CSV נכשל.",
    pngUnavailable: "ייצוא PNG אינו זמין.",
    pngStarted: "הורדת ה־PNG החלה.",
    pngFailed: "ייצוא ה־PNG נכשל: {{ reason }}",
    unknownError: "שגיאה לא ידועה",
    pngWaitForData: "המתינו לטעינת הגאומטריה ונתוני ההשוואה לפני ייצוא PNG.",
    vectorFailed: "לא ניתן היה ליצור את ייצוא הווקטור המקומי.",
    imageUnsupported: "הדפדפן שלכם אינו יכול ליצור ייצוא תמונה.",
    pngCreateFailed: "לא ניתן היה ליצור את ייצוא ה־PNG.",
  },
  poster: {
    brand: "סייר תוצאות הבחירות בישראל",
    comparisonTitle: "השוואת יישובים",
    resultsTitle: "תוצאות בחירות",
    keyInsight: "תובנה מרכזית",
    mapLegend: "מקרא המפה",
    strongest: "היישוב החזק ביותר: {{ locality }}",
    noData: "אין נתוני יישובים ממופים",
    source: "נתונים רשמיים של ועדת הבחירות המרכזית",
    comparisonAxis: "א' חזקה יותר ← שינוי בנקודות אחוז → ב' חזקה יותר",
    shareAxis: "שיעור נמוך ← שיעור הקולות ביישוב → שיעור גבוה",
  },
  party: {
    selected: "הרשימה הנבחרת",
  },
  units: {
    /** Percentage points. CLDR has no unit for these, so the abbreviation is translated. */
    points: "נק' אחוז",
  },
};

/** Inferred without `as const`, so translations are checked by key and shape, not by text. */
export type Dictionary = typeof dictionary;

export default dictionary;
