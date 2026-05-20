import React, { useEffect, useMemo, useState } from 'react';

const statusLabels = {
  pending_approval: 'לאישור',
  ready: 'מוכן',
  approved: 'מאושר',
  rejected: 'נדחה',
  executed: 'נשלח',
  answered: 'נענה',
  expired: 'פג',
  proposed: 'הוצע'
};

const riskLabels = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  critical: 'קריטי'
};

const riskTone = {
  low: { bg: '#eaf7ef', fg: '#176b3a', border: '#a8dfbd' },
  medium: { bg: '#fff7df', fg: '#8a5a00', border: '#efd185' },
  high: { bg: '#fff0e7', fg: '#a33a00', border: '#efb189' },
  critical: { bg: '#fdebec', fg: '#a31220', border: '#eca1aa' }
};

const commandCatalog = [
  {
    app: 'בריאות מערכת',
    command: 'inspect_health',
    title: 'בדיקת חיים מלאה',
    description: 'בודק זמינות רכיבי core, API, queue ותצורת runtime.',
    role: 'observer',
    risk: 'low',
    targetType: 'root-mcp',
    targetName: 'SafeSoundArena',
    taskTitle: 'בדיקת בריאות מערכת',
    reason: 'בדיקת readiness לפני המשך עבודה',
    questions: ['האם כל השירותים זמינים?', 'איזה רכיב דורש טיפול מיידי?'],
    answerRequest: 'Return { requestId, error, data: { status, blockers, nextActions } }.',
    payload: { checks: ['api', 'frontend', 'queue', 'policy'] }
  },
  {
    app: 'בריאות מערכת',
    command: 'inspect_runtime_ports',
    title: 'בדיקת פורטים ותהליכים',
    description: 'ממפה פורטים פעילים, תהליכים מאזינים והתנגשות בין שירותים.',
    role: 'ops',
    risk: 'low',
    targetType: 'system',
    targetName: 'localhost',
    taskTitle: 'מיפוי פורטים לחדר הבקרה',
    reason: 'לוודא שאין התנגשות בין frontend, API וסוכנים',
    questions: ['מי מאזין על 3000/4000?', 'האם יש תהליך כפול או תקוע?'],
    answerRequest: 'Return ports, owning processes, conflicts, and recommended cleanup.',
    payload: { ports: [3000, 3001, 4000, 6379] }
  },
  {
    app: 'בריאות מערכת',
    command: 'inspect_dependencies',
    title: 'בדיקת תלויות',
    description: 'בודק packages חסרים, mismatch בגרסאות, engine warnings וחובות אבטחה.',
    role: 'devops',
    risk: 'low',
    targetType: 'system',
    targetName: 'node-workspace',
    taskTitle: 'בדיקת תלויות וסיכוני npm',
    reason: 'לוודא שהמסוף יכול להיבנות ולהיבדק בלי הפתעות',
    questions: ['אילו תלויות חסרות?', 'איזה warning מונע build?', 'מה דורש PR נפרד?'],
    answerRequest: 'Return dependency gaps, install commands if needed, and security notes.',
    payload: { manifests: ['package.json', 'frontend/package.json'] }
  },
  {
    app: 'ולידציה',
    command: 'validate_repository',
    title: 'בדיקת repo לפני דחיפה',
    description: 'סריקת conflict markers, JSON, git diff --check, בדיקות ובילד.',
    role: 'devops',
    risk: 'low',
    targetType: 'root-mcp',
    targetName: 'Git workspace',
    taskTitle: 'ולידציה מלאה ל־GitHub',
    reason: 'הכנה לדחיפה או merge',
    questions: ['האם יש conflict markers?', 'האם JSON תקין?', 'אילו בדיקות עברו?'],
    answerRequest: 'Return validation matrix with pass/fail, command output summary, and blockers.',
    payload: { checks: ['conflict-markers', 'json-parse', 'tests', 'frontend-build', 'git-diff-check'] }
  },
  {
    app: 'ולידציה',
    command: 'validate_documents',
    title: 'בדיקת מסמכים ותיעוד',
    description: 'בודק README, docs, policy ופקודות מול החוזה של הפרויקט.',
    role: 'devops',
    risk: 'low',
    targetType: 'root-mcp',
    targetName: 'docs',
    taskTitle: 'ולידציה למסמכי פיתוח',
    reason: 'לוודא התאמה בין README, policy והמסוף',
    questions: ['האם התיעוד מתאר את ה־API הנוכחי?', 'האם חסרות פקודות במסמכים?'],
    answerRequest: 'Return doc drift, missing sections, and exact file paths to update.',
    payload: { docs: ['README.md', 'docs/AI_ADMIN_CONTROL_ROOM.md', 'server/ai-admin-policy.json'] }
  },
  {
    app: 'לוגים וביקורת',
    command: 'inspect_logs',
    title: 'קריאת לוגים',
    description: 'אוסף לוגים אחרונים ומחזיר תקלות, requestId וסימני כשל.',
    role: 'observer',
    risk: 'low',
    targetType: 'agent',
    targetName: 'log-collector',
    taskTitle: 'סקירת לוגים אחרונים',
    reason: 'בירור מה קרה לפני פעולה מנהלית',
    questions: ['מהן 5 השגיאות האחרונות?', 'האם יש requestId שחוזר על עצמו?'],
    answerRequest: 'Return grouped log findings by severity with requestId references.',
    payload: { limit: 200, severity: ['error', 'warn'] }
  },
  {
    app: 'לוגים וביקורת',
    command: 'summarize_errors',
    title: 'סיכום שגיאות',
    description: 'מזקק שגיאות חוזרות לתקלות פעולה ברורות.',
    role: 'observer',
    risk: 'low',
    targetType: 'agent',
    targetName: 'error-summarizer',
    taskTitle: 'סיכום שגיאות מערכת',
    reason: 'הפיכת רעש לוגים לרשימת תיקונים',
    questions: ['איזו שגיאה הכי חוזרת?', 'מה root cause משוער?'],
    answerRequest: 'Return error clusters, likely causes, and immediate actions.',
    payload: { windowMinutes: 60 }
  },
  {
    app: 'לוגים וביקורת',
    command: 'audit_review',
    title: 'ביקורת הרשאות',
    description: 'בודק מי אישר, דחה, שלח או ענה לפקודות.',
    role: 'observer',
    risk: 'medium',
    targetType: 'root-mcp',
    targetName: 'audit-log',
    taskTitle: 'בדיקת audit trail',
    reason: 'בדיקת התאמת פעולות ניהול למדיניות',
    questions: ['האם הייתה פעולה קריטית ללא אישור?', 'מי actor הפעיל ביותר?'],
    answerRequest: 'Return suspicious audit events, actor summary, and approval gaps.',
    payload: { limit: 100 }
  },
  {
    app: 'לוגים וביקורת',
    command: 'question_status',
    title: 'סטטוס שאלות פתוחות',
    description: 'בודק אילו פקודות מחכות למענה חוזר מסוכן או מערכת.',
    role: 'observer',
    risk: 'low',
    targetType: 'root-mcp',
    targetName: 'command-queue',
    taskTitle: 'מעקב שאלות פתוחות',
    reason: 'לסגור פערי תשובה לפני dispatch',
    questions: ['אילו פקודות מחכות לתשובה?', 'מה חסר כדי לאשר?'],
    answerRequest: 'Return open questions grouped by commandId and owner.',
    payload: { statuses: ['pending_approval', 'executed'] }
  },
  {
    app: 'סוכנים ומשימות',
    command: 'summarize_agent_status',
    title: 'מצב סוכנים',
    description: 'מסכם זמינות, יכולות, עומס ותקלות של agents.',
    role: 'observer',
    risk: 'low',
    targetType: 'agent',
    targetName: 'all-agents',
    taskTitle: 'בדיקת מצב סוכנים',
    reason: 'לוודא מי יכול לקבל משימות עכשיו',
    questions: ['איזה agent online?', 'מי תקוע?', 'איזה capability חסר?'],
    answerRequest: 'Return agent status table with capability and health fields.',
    payload: { includeCapabilities: true }
  },
  {
    app: 'סוכנים ומשימות',
    command: 'task_status',
    title: 'סטטוס משימה',
    description: 'בודק משימה ספציפית או queue של משימות.',
    role: 'observer',
    risk: 'low',
    targetType: 'agent',
    targetName: 'task-runner',
    taskTitle: 'בדיקת סטטוס משימות',
    reason: 'מעקב אחרי משימות שנשלחו לסוכנים',
    questions: ['מה מצב המשימה?', 'האם נדרש retry או אישור?'],
    answerRequest: 'Return task state, last update, owner, and next action.',
    payload: { taskId: 'latest' }
  },
  {
    app: 'סוכנים ומשימות',
    command: 'request_agent_answer',
    title: 'בקשת תשובה מסוכן',
    description: 'מבקש מסוכן להחזיר תשובה מובנית לפקודה קיימת.',
    role: 'ops',
    risk: 'low',
    targetType: 'agent',
    targetName: 'answer-agent',
    taskTitle: 'החזרת תשובה לפקודה',
    reason: 'לסגור שאלות לפני אישור מנהל',
    questions: ['מה עשית?', 'מה לא בוצע?', 'מה צריך אישור?'],
    answerRequest: 'Return { summary, completed, blocked, needsApproval, evidence }.',
    payload: { responseMode: 'structured' }
  },
  {
    app: 'סוכנים ומשימות',
    command: 'run_diagnostic_task',
    title: 'הרצת דיאגנוסטיקה',
    description: 'פותח משימת אבחון נמוכת סיכון על סביבת הפיתוח.',
    role: 'ops',
    risk: 'low',
    targetType: 'agent',
    targetName: 'diagnostic-agent',
    taskTitle: 'דיאגנוסטיקת סביבת פיתוח',
    reason: 'בדיקה לפני שינוי או אחרי תקלה',
    questions: ['מה תקין?', 'מה לא תקין?', 'מה לתקן קודם?'],
    answerRequest: 'Return diagnostic checklist with severity and suggested commands.',
    payload: { scope: ['runtime', 'api', 'frontend'] }
  },
  {
    app: 'סוכנים ומשימות',
    command: 'restart_agent',
    title: 'הצעת restart לסוכן',
    description: 'פעולה תפעולית עם סיכון בינוני שמחזירה אישור/תיעוד.',
    role: 'ops',
    risk: 'medium',
    targetType: 'agent',
    targetName: 'selected-agent',
    taskTitle: 'Restart לסוכן תקוע',
    reason: 'סוכן לא מחזיר heartbeat או משימות',
    questions: ['האם restart בטוח עכשיו?', 'איזה task יושפע?'],
    answerRequest: 'Return affected tasks, restart safety, and rollback note.',
    payload: { graceful: true }
  },
  {
    app: 'סוכנים ומשימות',
    command: 'dispatch_agent_command',
    title: 'שליחת פקודת agent',
    description: 'פקודה גבוהה שדורשת אישור לפני dispatch.',
    role: 'ops',
    risk: 'high',
    targetType: 'agent',
    targetName: 'selected-agent',
    taskTitle: 'שליחת פקודה לסוכן',
    reason: 'נדרש ביצוע ממוקד אחרי סימולציה',
    questions: ['מה הפקודה המדויקת?', 'מה גבולות הביצוע?', 'איך חוזרים אחורה?'],
    answerRequest: 'Return dispatch receipt, execution boundary, and result contract.',
    payload: { command: 'describe-next-action', dryRunFirst: true }
  },
  {
    app: 'אבטחה',
    command: 'propose_incident',
    title: 'פתיחת אירוע',
    description: 'מציע incident עם evidence, scope וצעדי containment.',
    role: 'security',
    risk: 'high',
    targetType: 'system',
    targetName: 'incident-response',
    taskTitle: 'פתיחת אירוע אבטחה',
    reason: 'זוהתה התנהגות חריגה או סיכון גבוה',
    questions: ['מה היקף האירוע?', 'מה צריך לחסום?', 'מי מאשר containment?'],
    answerRequest: 'Return incident summary, severity, evidence, containment, owner.',
    payload: { severity: 'high', containment: [] },
    impact: { userFacing: false, requiresComms: true }
  },
  {
    app: 'אבטחה',
    command: 'propose_rotate_token',
    title: 'סיבוב token',
    description: 'מציע החלפת token או secret אחרי חשד לחשיפה.',
    role: 'security',
    risk: 'critical',
    targetType: 'system',
    targetName: 'secrets',
    taskTitle: 'הצעת rotate ל־token',
    reason: 'חשד לחשיפת secret או הקשחת הרשאות',
    questions: ['איזה token מושפע?', 'מה תלוי בו?', 'מה חלון ההחלפה?'],
    answerRequest: 'Return affected services, rotation plan, rollback and verification.',
    payload: { secretName: 'ADMIN_TOKEN', rotationWindow: 'maintenance' },
    impact: { downtimeRisk: 'medium' }
  },
  {
    app: 'קהילה ומודרציה',
    command: 'summarize_users',
    title: 'סיכום משתמשים',
    description: 'מסכם פעילות, משתמשים חריגים ודפוסי reputation.',
    role: 'community',
    risk: 'medium',
    targetType: 'system',
    targetName: 'community-board',
    taskTitle: 'סקירת משתמשים ופעילות',
    reason: 'בדיקת קהילה לפני פעולה מנהלית',
    questions: ['מי חריג?', 'איזה משתמש דורש בדיקה?', 'מה evidence?'],
    answerRequest: 'Return user activity summary with risk markers and evidence references.',
    payload: { windowHours: 24 }
  },
  {
    app: 'קהילה ומודרציה',
    command: 'summarize_reports',
    title: 'סיכום דיווחים',
    description: 'מזקק דיווחי משתמשים לפעולות moderation מוצעות.',
    role: 'community',
    risk: 'medium',
    targetType: 'system',
    targetName: 'reports',
    taskTitle: 'סקירת דיווחים',
    reason: 'עדיפות לטיפול בדיווחים פתוחים',
    questions: ['איזה דיווח דחוף?', 'מה צריך לאשר?', 'האם חסר evidence?'],
    answerRequest: 'Return report queue with severity, recommended action and confidence.',
    payload: { includeClosed: false }
  },
  {
    app: 'קהילה ומודרציה',
    command: 'propose_moderation_review',
    title: 'ביקורת moderation',
    description: 'מציע review לפני חסימה, שחזור או שינוי מוניטין.',
    role: 'community',
    risk: 'medium',
    targetType: 'system',
    targetName: 'moderation',
    taskTitle: 'בקשת review למקרה moderation',
    reason: 'צריך החלטה אנושית עם evidence',
    questions: ['מה הטענה?', 'מה evidence?', 'מה הפעולה המומלצת?'],
    answerRequest: 'Return moderation case summary, evidence, recommendation, confidence.',
    payload: { caseId: 'latest' }
  },
  {
    app: 'קהילה ומודרציה',
    command: 'propose_block_user',
    title: 'הצעת חסימת משתמש',
    description: 'דורש אישור מנהל לפני פעולה משתמשית רגישה.',
    role: 'community',
    risk: 'high',
    targetType: 'system',
    targetName: 'user-safety',
    taskTitle: 'הצעת חסימת משתמש',
    reason: 'סיכון קהילה או הפרת מדיניות',
    questions: ['מי המשתמש?', 'מה evidence?', 'כמה זמן חסימה?'],
    answerRequest: 'Return userId, reason, evidence, duration, appeal path.',
    payload: { userId: '', duration: '24h' },
    impact: { userFacing: true }
  },
  {
    app: 'GitHub ו־CI',
    command: 'inspect_ci_status',
    title: 'בדיקת CI',
    description: 'קורא מצב בדיקות, jobs כושלים וארטיפקטים רלוונטיים.',
    role: 'devops',
    risk: 'low',
    targetType: 'system',
    targetName: 'github-actions',
    taskTitle: 'בדיקת סטטוס CI',
    reason: 'לוודא שה־PR מוכן לסקירה',
    questions: ['איזה check נכשל?', 'האם זה flaky?', 'מה הלוג החשוב?'],
    answerRequest: 'Return CI matrix, failing jobs, log highlights, retry/fix recommendation.',
    payload: { branch: 'codex/ai-command-control-room' }
  },
  {
    app: 'GitHub ו־CI',
    command: 'inspect_github_pr',
    title: 'בדיקת PR',
    description: 'מסכם diff, תגובות, סטטוס merge וסיכונים לפני merge.',
    role: 'devops',
    risk: 'low',
    targetType: 'system',
    targetName: 'GitHub PR',
    taskTitle: 'סקירת PR',
    reason: 'בדיקת מוכנות לפני דחיפה או merge',
    questions: ['האם יש review פתוח?', 'האם branch מעודכן?', 'מה סיכון ה־diff?'],
    answerRequest: 'Return PR summary, mergeability, checks, review blockers.',
    payload: { pr: 3 }
  },
  {
    app: 'GitHub ו־CI',
    command: 'request_code_review',
    title: 'בקשת review קוד',
    description: 'פותח משימת review ממוקדת לבאגים, רגרסיות וחוסרי בדיקה.',
    role: 'devops',
    risk: 'medium',
    targetType: 'agent',
    targetName: 'review-agent',
    taskTitle: 'Code review ממוקד',
    reason: 'איתור סיכונים לפני merge',
    questions: ['מה נשבר?', 'אילו בדיקות חסרות?', 'מה severity?'],
    answerRequest: 'Return findings first with file/line, severity, and test gaps.',
    payload: { scope: ['frontend/src/ui/AiAdminControlRoom.jsx', 'server/aiAdminGovernance.js'] }
  },
  {
    app: 'GitHub ו־CI',
    command: 'request_test_run',
    title: 'בקשת הרצת בדיקות',
    description: 'מבקש מסוכן להריץ סט בדיקות ולחזור עם סיכום קצר.',
    role: 'devops',
    risk: 'medium',
    targetType: 'agent',
    targetName: 'test-runner',
    taskTitle: 'הרצת בדיקות ממוקדת',
    reason: 'אימות שינוי לפני אישור',
    questions: ['איזה command רץ?', 'מה עבר?', 'מה נכשל?'],
    answerRequest: 'Return commands, pass/fail, relevant output, and next fix.',
    payload: { commands: ['npm.cmd test', 'npm.cmd run build --workspace frontend'] }
  },
  {
    app: 'פריסה ושחרור',
    command: 'propose_deploy',
    title: 'הצעת deploy',
    description: 'הצעת פריסה עם צ׳קליסט, סיכונים וrollback.',
    role: 'devops',
    risk: 'critical',
    targetType: 'system',
    targetName: 'deployment',
    taskTitle: 'הצעת פריסה',
    reason: 'שינוי מוכן לאחר בדיקות ואישור',
    questions: ['מה נפרס?', 'איך מאמתים?', 'איך חוזרים אחורה?'],
    answerRequest: 'Return deploy plan, validation, rollback, owner, approval gates.',
    payload: { environment: 'staging' },
    impact: { downtimeRisk: 'low', userFacing: true }
  },
  {
    app: 'פריסה ושחרור',
    command: 'propose_rollback',
    title: 'הצעת rollback',
    description: 'מכין חזרה לגרסה קודמת עם טריגרים ברורים.',
    role: 'devops',
    risk: 'critical',
    targetType: 'system',
    targetName: 'deployment',
    taskTitle: 'הצעת rollback',
    reason: 'נמצאה רגרסיה או סיכון production',
    questions: ['לאיזו גרסה חוזרים?', 'מה criterion להפעלה?', 'איך מאמתים?'],
    answerRequest: 'Return rollback target, trigger, steps, data risk, verification.',
    payload: { environment: 'production' },
    impact: { downtimeRisk: 'medium', userFacing: true }
  },
  {
    app: 'פריסה ושחרור',
    command: 'propose_merge_pr',
    title: 'הצעת merge ל־PR',
    description: 'דורש אישור אחרי CI, review וולידציה.',
    role: 'devops',
    risk: 'critical',
    targetType: 'system',
    targetName: 'GitHub',
    taskTitle: 'הצעת merge',
    reason: 'PR מוכן לכאורה וצריך אישור מנהל',
    questions: ['האם CI ירוק?', 'האם יש unresolved review?', 'מה סיכון merge?'],
    answerRequest: 'Return merge readiness, required approvals, and post-merge checks.',
    payload: { pr: 3, strategy: 'squash' },
    impact: { userFacing: false }
  },
  {
    app: 'פריסה ושחרור',
    command: 'propose_env_change',
    title: 'שינוי ENV',
    description: 'מציע שינוי משתנה סביבה עם אימות וrollback.',
    role: 'devops',
    risk: 'critical',
    targetType: 'system',
    targetName: 'environment',
    taskTitle: 'הצעת שינוי ENV',
    reason: 'שינוי תצורה נדרש להפעלה בטוחה',
    questions: ['איזה key?', 'מה הערך החדש?', 'מה השירותים המושפעים?'],
    answerRequest: 'Return env key, scope, rollout plan, rollback and secret handling.',
    payload: { key: '', environment: 'staging' },
    impact: { secretHandling: true }
  },
  {
    app: 'תשלומים וכלכלה',
    command: 'propose_payment_hold',
    title: 'עצירת תשלום לבדיקה',
    description: 'הצעה לעכב payout או payment flow בעקבות סיכון.',
    role: 'finance',
    risk: 'high',
    targetType: 'system',
    targetName: 'payments',
    taskTitle: 'הצעת hold לתשלום',
    reason: 'חשד לתשלום חריג או mismatch',
    questions: ['איזה paymentId?', 'מה הסיכון?', 'מי צריך לאשר שחרור?'],
    answerRequest: 'Return payment scope, risk, hold duration, release criteria.',
    payload: { paymentId: '', holdReason: '' },
    impact: { userFacing: true, financial: true }
  },
  {
    app: 'תשלומים וכלכלה',
    command: 'rotate_payment_keys',
    title: 'סיבוב מפתחות תשלום',
    description: 'פקודה אסורה לביצוע AI, דורשת מנהל ותהליך ידני.',
    role: 'finance',
    risk: 'critical',
    targetType: 'system',
    targetName: 'payment-secrets',
    taskTitle: 'בקשת rotate למפתחות תשלום',
    reason: 'חשד לחשיפה או מעבר סביבה',
    questions: ['אילו מפתחות?', 'מי הבעלים?', 'איך מאמתים שאין downtime?'],
    answerRequest: 'Return manual rotation checklist and affected integrations.',
    payload: { provider: 'pi-network' },
    impact: { financial: true, downtimeRisk: 'high' }
  },
  {
    app: 'ממשל והרשאות',
    command: 'run_system_task',
    title: 'משימת מערכת רגישה',
    description: 'שער כללי לפעולה מסוכנת עם אישור מנהל.',
    role: 'governance',
    risk: 'high',
    targetType: 'system',
    targetName: 'SafeSoundArena',
    taskTitle: 'משימת מערכת',
    reason: 'נדרשת פעולה שאינה read-only',
    questions: ['מה בדיוק יבוצע?', 'מה הסיכון?', 'מה rollback?'],
    answerRequest: 'Return task boundary, approvals, dry-run result, rollback.',
    payload: { dryRun: true }
  },
  {
    app: 'ממשל והרשאות',
    command: 'promote_admin',
    title: 'קידום מנהל',
    description: 'אסור לביצוע AI. המסוף רק מתעד בקשת אישור.',
    role: 'governance',
    risk: 'critical',
    targetType: 'system',
    targetName: 'admin-access',
    taskTitle: 'בקשת קידום מנהל',
    reason: 'שינוי הרשאה קריטי',
    questions: ['מי המשתמש?', 'מי מאשר?', 'מה תוקף ההרשאה?'],
    answerRequest: 'Return manual approval record, scope, expiry, audit requirement.',
    payload: { userId: '', expiresAt: '' },
    impact: { accessControl: true }
  }
];

const targetOptions = [
  { type: 'root-mcp', name: 'SafeSoundArena' },
  { type: 'mini-mcp', name: 'Mini-MCP' },
  { type: 'agent', name: 'diagnostic-agent' },
  { type: 'agent', name: 'review-agent' },
  { type: 'agent', name: 'test-runner' },
  { type: 'system', name: 'GitHub' },
  { type: 'system', name: 'deployment' },
  { type: 'system', name: 'payments' },
  { type: 'system', name: 'admin-access' }
];

const initialTemplate = commandCatalog[0];

function templateToDraft(template) {
  return {
    command: template.command,
    targetType: template.targetType,
    targetName: template.targetName,
    risk: template.risk,
    role: template.role,
    taskTitle: template.taskTitle,
    reason: template.reason,
    answerRequest: template.answerRequest,
    questions: template.questions.join('\n'),
    payloadText: JSON.stringify(template.payload || {}, null, 2),
    impactText: JSON.stringify(template.impact || {}, null, 2)
  };
}

const initialDraft = templateToDraft(initialTemplate);

function safeDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('he-IL');
}

function parseJsonText(value, fieldName) {
  if (!value || !value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${fieldName} חייב להיות JSON תקין`);
  }
}

function compactText(value, max = 120) {
  if (!value) return '-';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function resolveAdminToken() {
  const envToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
  if (typeof window === 'undefined') return envToken;

  const configuredToken = window.ADMIN_TOKEN || window.localStorage?.getItem('ADMIN_TOKEN') || envToken;
  if (configuredToken) return configuredToken;

  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  return localHosts.has(window.location.hostname) ? 'dev-admin-token' : '';
}

export default function AiAdminControlRoom() {
  const [commands, setCommands] = useState([]);
  const [allCommands, setAllCommands] = useState([]);
  const [audit, setAudit] = useState([]);
  const [capabilities, setCapabilities] = useState(null);
  const [status, setStatus] = useState('pending_approval');
  const [activeApp, setActiveApp] = useState(initialTemplate.app);
  const [draft, setDraft] = useState(initialDraft);
  const [simulation, setSimulation] = useState(null);
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [autoDispatchSafe, setAutoDispatchSafe] = useState(false);
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const adminToken = resolveAdminToken();

  const groupedCatalog = useMemo(() => {
    return commandCatalog.reduce((acc, item) => {
      if (!acc[item.app]) acc[item.app] = [];
      acc[item.app].push(item);
      return acc;
    }, {});
  }, []);

  const selectedTemplate = useMemo(() => {
    return commandCatalog.find(item => item.command === draft.command) || initialTemplate;
  }, [draft.command]);

  const counts = useMemo(() => {
    return allCommands.reduce((acc, command) => {
      acc[command.status] = (acc[command.status] || 0) + 1;
      return acc;
    }, {});
  }, [allCommands]);

  const riskStats = useMemo(() => {
    return allCommands.reduce((acc, command) => {
      acc[command.risk] = (acc[command.risk] || 0) + 1;
      return acc;
    }, {});
  }, [allCommands]);

  const pendingCount = counts.pending_approval || 0;
  const selectedRequiresApproval = draft.risk === 'high' || draft.risk === 'critical' || selectedTemplate.command.startsWith('propose_');
  const canAutoDispatchDraft = !selectedRequiresApproval && ['low', 'medium'].includes(draft.risk);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return commands.filter(command => {
      const riskMatches = riskFilter === 'all' || command.risk === riskFilter;
      const text = [
        command.id,
        command.command,
        command.status,
        command.risk,
        command.target?.type,
        command.target?.name,
        command.task?.title,
        command.reason
      ].filter(Boolean).join(' ').toLowerCase();
      return riskMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [commands, query, riskFilter]);

  async function api(path, options = {}) {
    const response = await fetch(`/api/admin/ai${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
        'x-admin-user': 'dashboard',
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.error) {
      throw new Error(payload?.error?.message || 'Admin command API failed');
    }
    return payload?.data ?? payload;
  }

  async function load(nextStatus = status) {
    setLoading(true);
    setError('');
    try {
      const query = nextStatus === 'all' ? '' : `?status=${nextStatus}`;
      const [nextCommands, nextAllCommands, nextAudit, nextCapabilities] = await Promise.all([
        api(`/commands${query}`),
        nextStatus === 'all' ? Promise.resolve(null) : api('/commands'),
        api('/logs?limit=40'),
        api('/capabilities')
      ]);
      setCommands(Array.isArray(nextCommands) ? nextCommands : []);
      setAllCommands(Array.isArray(nextAllCommands) ? nextAllCommands : Array.isArray(nextCommands) ? nextCommands : []);
      setAudit(Array.isArray(nextAudit) ? nextAudit : []);
      setCapabilities(nextCapabilities || null);
    } catch (err) {
      setError(err.message || 'שגיאה בטעינת מסוף הפיקוד');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(status);
  }, [status]);

  function updateDraft(field, value) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  function applyTemplate(template) {
    setActiveApp(template.app);
    setDraft(templateToDraft(template));
    setSimulation(null);
    setSelectedCommand(null);
    setNotice(`נטענה תבנית: ${template.title}`);
  }

  function updateCommand(command) {
    const template = commandCatalog.find(item => item.command === command);
    if (template) {
      applyTemplate(template);
      return;
    }
    updateDraft('command', command);
  }

  async function createCommand(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const questions = draft.questions
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
      const payload = parseJsonText(draft.payloadText, 'Payload');
      const impact = parseJsonText(draft.impactText, 'Impact');
      const created = await api('/commands', {
        method: 'POST',
        body: JSON.stringify({ ...draft, questions, payload, impact })
      });
      setSelectedCommand(created);
      if (autoDispatchSafe && created.status === 'ready' && created.executionAllowed && !created.forbiddenForAiExecution) {
        const dispatched = await api(`/commands/${created.id}/dispatch`, {
          method: 'POST',
          body: JSON.stringify({})
        });
        setSelectedCommand(dispatched);
        setSimulation(dispatched.result || null);
        setStatus('executed');
        setNotice(`פקודה נוצרה והורצה: ${created.id}`);
        await load('executed');
        return;
      }
      setStatus(created.status || 'pending_approval');
      setNotice(`פקודה נוצרה: ${created.id}`);
      await load(created.status || 'pending_approval');
    } catch (err) {
      setError(err.message || 'יצירת פקודה נכשלה');
    }
  }

  async function commandAction(label, action) {
    setError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(label);
      await load();
      return result;
    } catch (err) {
      setError(err.message || 'פעולה נכשלה');
      return null;
    }
  }

  async function approve(commandId) {
    await commandAction('הפקודה אושרה', () => api(`/commands/${commandId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: 'Approved from command center' })
    }));
  }

  async function reject(commandId) {
    await commandAction('הפקודה נדחתה', () => api(`/commands/${commandId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Rejected from command center' })
    }));
  }

  async function dispatch(commandId) {
    const result = await commandAction('הפקודה נשלחה', () => api(`/commands/${commandId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({})
    }));
    if (result) {
      setSelectedCommand(result);
      setSimulation(result.result || null);
    }
  }

  async function answer(commandId) {
    const data = window.prompt('תשובה חוזרת לפקודה');
    if (!data) return;
    await commandAction('נשמרה תשובה לפקודה', () => api(`/commands/${commandId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ data })
    }));
  }

  async function simulate(commandId) {
    const result = await commandAction('סימולציה הושלמה', () => api(`/commands/${commandId}/simulate`, { method: 'POST' }));
    if (result) {
      setSimulation(result);
      setSelectedCommand(commands.find(command => command.id === commandId) || null);
    }
  }

  return (
    <main dir="rtl" style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>SafeSoundArena AI Command Center</div>
          <h1 style={styles.title}>מסוף פיקוד ובקרה</h1>
          <div style={styles.subtitle}>
            {capabilities?.commands?.length ? `${capabilities.commands.length} פקודות רשומות במדיניות` : 'טוען מדיניות פקודות'}
          </div>
        </div>
        <div style={styles.headerActions}>
          <select value={status} onChange={event => setStatus(event.target.value)} style={styles.select}>
            <option value="pending_approval">לאישור</option>
            <option value="ready">מוכן</option>
            <option value="approved">מאושר</option>
            <option value="executed">נשלח</option>
            <option value="answered">נענה</option>
            <option value="rejected">נדחה</option>
            <option value="all">הכל</option>
          </select>
          <button type="button" onClick={() => load(status)} style={styles.primaryButton}>רענן</button>
        </div>
      </header>

      <section style={styles.metrics}>
        <Metric label="ממתינות לאישור" value={pendingCount} tone={pendingCount ? 'warn' : 'ok'} />
        <Metric label="מוכנות לשליחה" value={counts.ready || 0} tone="neutral" />
        <Metric label="נענו" value={counts.answered || 0} tone="ok" />
        <Metric label="סיכון קריטי" value={riskStats.critical || 0} tone={riskStats.critical ? 'danger' : 'neutral'} />
      </section>

      {(error || notice) && (
        <div style={error ? styles.errorBanner : styles.noticeBanner}>
          {error || notice}
        </div>
      )}

      <section style={styles.workspace}>
        <aside style={styles.commandLibrary}>
          <h2 style={styles.sectionTitle}>יישומי פיקוד</h2>
          <div style={styles.appTabs}>
            {Object.keys(groupedCatalog).map(app => (
              <button
                key={app}
                type="button"
                onClick={() => setActiveApp(app)}
                style={activeApp === app ? styles.appTabActive : styles.appTab}
              >
                {app}
              </button>
            ))}
          </div>
          <div style={styles.templateList}>
            {(groupedCatalog[activeApp] || []).map(template => (
              <button
                key={template.command}
                type="button"
                onClick={() => applyTemplate(template)}
                style={draft.command === template.command ? styles.templateActive : styles.templateButton}
              >
                <span style={styles.templateTitle}>{template.title}</span>
                <span style={styles.templateCommand}>{template.command}</span>
                <span style={styles.templateDescription}>{template.description}</span>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={createCommand} style={styles.commandForm}>
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.sectionTitle}>בניית פקודה</h2>
              <div style={styles.formHint}>{selectedTemplate.description}</div>
            </div>
            <RiskBadge risk={draft.risk} />
          </div>

          <div style={styles.formGrid}>
            <label style={styles.field}>
              פקודה
              <select value={draft.command} onChange={event => updateCommand(event.target.value)} style={styles.input}>
                {Object.entries(groupedCatalog).map(([app, items]) => (
                  <optgroup key={app} label={app}>
                    {items.map(item => <option key={item.command} value={item.command}>{item.title} - {item.command}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              תפקיד
              <select value={draft.role} onChange={event => updateDraft('role', event.target.value)} style={styles.input}>
                <option value="observer">observer</option>
                <option value="ops">ops</option>
                <option value="security">security</option>
                <option value="community">community</option>
                <option value="devops">devops</option>
                <option value="finance">finance</option>
                <option value="governance">governance</option>
              </select>
            </label>
            <label style={styles.field}>
              סיכון
              <select value={draft.risk} onChange={event => updateDraft('risk', event.target.value)} style={styles.input}>
                {Object.keys(riskLabels).map(risk => <option key={risk} value={risk}>{riskLabels[risk]}</option>)}
              </select>
            </label>
            <label style={styles.field}>
              יעד מהיר
              <select
                value={`${draft.targetType}:${draft.targetName}`}
                onChange={event => {
                  const [targetType, ...nameParts] = event.target.value.split(':');
                  updateDraft('targetType', targetType);
                  updateDraft('targetName', nameParts.join(':'));
                }}
                style={styles.input}
              >
                {targetOptions.map(target => (
                  <option key={`${target.type}:${target.name}`} value={`${target.type}:${target.name}`}>
                    {target.type}:{target.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              סוג יעד
              <input value={draft.targetType} onChange={event => updateDraft('targetType', event.target.value)} style={styles.input} />
            </label>
            <label style={styles.field}>
              שם יעד
              <input value={draft.targetName} onChange={event => updateDraft('targetName', event.target.value)} style={styles.input} />
            </label>
            <label style={{ ...styles.field, gridColumn: 'span 2' }}>
              משימה
              <input value={draft.taskTitle} onChange={event => updateDraft('taskTitle', event.target.value)} style={styles.input} />
            </label>
            <label style={{ ...styles.field, gridColumn: 'span 2' }}>
              סיבת פקודה
              <input value={draft.reason} onChange={event => updateDraft('reason', event.target.value)} style={styles.input} />
            </label>
            <label style={{ ...styles.field, gridColumn: 'span 2' }}>
              שאלות למענה
              <textarea value={draft.questions} onChange={event => updateDraft('questions', event.target.value)} rows={5} style={styles.textarea} />
            </label>
            <label style={{ ...styles.field, gridColumn: 'span 2' }}>
              חוזה תשובה
              <textarea value={draft.answerRequest} onChange={event => updateDraft('answerRequest', event.target.value)} rows={5} style={styles.textarea} />
            </label>
            <label style={{ ...styles.field, gridColumn: 'span 2' }}>
              Payload JSON
              <textarea value={draft.payloadText} onChange={event => updateDraft('payloadText', event.target.value)} rows={6} style={styles.codeTextarea} />
            </label>
            <label style={{ ...styles.field, gridColumn: 'span 2' }}>
              Impact JSON
              <textarea value={draft.impactText} onChange={event => updateDraft('impactText', event.target.value)} rows={6} style={styles.codeTextarea} />
            </label>
          </div>

          <div style={styles.commandSummary}>
            <div>
              <strong>מסלול אישור:</strong> {selectedRequiresApproval ? 'דורש אישור מנהל לפני ביצוע' : 'ניתן להיכנס ל־ready לפי policy'}
            </div>
            <div>
              <strong>יעד:</strong> {draft.targetType}:{draft.targetName}
            </div>
            <div>
              <strong>חוזה:</strong> {compactText(draft.answerRequest, 90)}
            </div>
          </div>

          <label style={styles.inlineCheck}>
            <input
              type="checkbox"
              checked={autoDispatchSafe}
              disabled={!canAutoDispatchDraft}
              onChange={event => setAutoDispatchSafe(event.target.checked)}
            />
            צור והריץ אוטומטית אם הפקודה בטוחה ומוכנה
          </label>

          <button type="submit" style={styles.createButton}>
            {autoDispatchSafe && canAutoDispatchDraft ? 'צור והריץ פקודה בטוחה' : 'צור פקודה למסוף'}
          </button>
        </form>
      </section>

      <section style={styles.lowerGrid}>
        <div style={styles.tablePanel}>
          <div style={styles.tableHeader}>
            <div>
              <h2 style={styles.sectionTitle}>תור פקודות</h2>
              <span style={styles.muted}>{loading ? 'טוען...' : `${filteredCommands.length} מתוך ${commands.length} רשומות בתצוגה`}</span>
            </div>
            <div style={styles.tableTools}>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="חיפוש פקודה, יעד, מזהה"
                style={styles.searchInput}
              />
              <select value={riskFilter} onChange={event => setRiskFilter(event.target.value)} style={styles.smallSelect}>
                <option value="all">כל הסיכונים</option>
                {Object.keys(riskLabels).map(risk => <option key={risk} value={risk}>{riskLabels[risk]}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>סטטוס</th>
                  <th style={styles.th}>פקודה</th>
                  <th style={styles.th}>יעד</th>
                  <th style={styles.th}>סיכון</th>
                  <th style={styles.th}>משימה</th>
                  <th style={styles.th}>עודכן</th>
                  <th style={styles.th}>תשובה</th>
                  <th style={styles.th}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={styles.td}>טוען...</td></tr>}
                {!loading && filteredCommands.length === 0 && (
                  <tr>
                    <td colSpan={8} style={styles.emptyCell}>
                      אין פקודות שמתאימות לתצוגה הנוכחית.
                    </td>
                  </tr>
                )}
                {!loading && filteredCommands.map(command => (
                  <tr key={command.id} style={selectedCommand?.id === command.id ? styles.selectedRow : undefined}>
                    <td style={styles.td}><StatusBadge status={command.status} /></td>
                    <td style={styles.td}>
                      <div style={styles.mono}>{command.command}</div>
                      <div style={styles.smallId}>{command.id}</div>
                    </td>
                    <td style={styles.td}>{command.target?.type}:{command.target?.name}</td>
                    <td style={styles.td}><RiskBadge risk={command.risk} /></td>
                    <td style={styles.td}>{command.task?.title || command.reason || '-'}</td>
                    <td style={styles.td}>{safeDate(command.updatedAt || command.createdAt)}</td>
                    <td style={styles.td}>{compactText(command.answer?.data || command.result?.message || command.result, 80)}</td>
                    <td style={{ ...styles.td, minWidth: 260 }}>
                      <div style={styles.rowActions}>
                        <button type="button" onClick={() => setSelectedCommand(command)} style={styles.actionButton}>פרטים</button>
                        <button type="button" onClick={() => simulate(command.id)} style={styles.actionButton}>בדוק</button>
                        {command.status === 'pending_approval' && <button type="button" onClick={() => approve(command.id)} style={styles.actionButton}>אשר</button>}
                        {['pending_approval', 'ready', 'approved'].includes(command.status) && <button type="button" onClick={() => reject(command.id)} style={styles.dangerButton}>דחה</button>}
                        {['ready', 'approved'].includes(command.status) && !command.forbiddenForAiExecution && <button type="button" onClick={() => dispatch(command.id)} style={styles.actionButton}>שלח</button>}
                        <button type="button" onClick={() => answer(command.id)} style={styles.actionButton}>השב</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside style={styles.sidePanels}>
          <div style={styles.darkPanel}>
            <h2 style={styles.darkTitle}>ביקורת אחרונה</h2>
            {audit.length === 0 && <div style={styles.darkMuted}>אין רשומות</div>}
            {audit.slice(0, 10).map(entry => (
              <div key={entry.id} style={styles.auditItem}>
                <strong>{entry.event}</strong>
                <div>{entry.actor}</div>
                <div>{safeDate(entry.at)}</div>
                <div style={styles.smallId}>{entry.requestId}</div>
              </div>
            ))}
          </div>

          <div style={styles.lightPanel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.sectionTitle}>פרטי פקודה / תוצאה</h2>
              {(selectedCommand || simulation) && (
                <button type="button" onClick={() => { setSelectedCommand(null); setSimulation(null); }} style={styles.actionButton}>נקה</button>
              )}
            </div>
            <pre style={styles.pre}>
              {selectedCommand || simulation
                ? JSON.stringify({ selectedCommand, simulation }, null, 2)
                : 'אין פרטים. לחץ "פרטים", "בדוק" או "שלח" על פקודה כדי לראות תוצאה מלאה.'}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }) {
  const toneStyle = {
    ok: { borderColor: '#bde4ca', color: '#176b3a' },
    warn: { borderColor: '#efd185', color: '#8a5a00' },
    danger: { borderColor: '#eca1aa', color: '#a31220' },
    neutral: { borderColor: '#d7dce3', color: '#263241' }
  }[tone || 'neutral'];

  return (
    <div style={{ ...styles.metric, ...toneStyle }}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

function RiskBadge({ risk }) {
  const tone = riskTone[risk] || riskTone.medium;
  return (
    <span style={{ ...styles.badge, color: tone.fg, background: tone.bg, borderColor: tone.border }}>
      {riskLabels[risk] || risk}
    </span>
  );
}

function StatusBadge({ status }) {
  return <span style={styles.statusBadge}>{statusLabels[status] || status}</span>;
}

const styles = {
  page: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: 24,
    color: '#17202a',
    background: '#f6f8fb',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 16
  },
  eyebrow: { fontSize: 12, color: '#607086', fontWeight: 700 },
  title: { margin: '4px 0 0', fontSize: 30, lineHeight: 1.2 },
  subtitle: { marginTop: 6, color: '#607086', fontSize: 14 },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  select: { height: 38, minWidth: 170, border: '1px solid #cfd6df', borderRadius: 6, background: '#fff', padding: '0 10px' },
  primaryButton: { height: 38, border: '1px solid #263241', background: '#263241', color: '#fff', borderRadius: 6, padding: '0 14px', cursor: 'pointer' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
  metric: { background: '#fff', border: '1px solid', borderRadius: 8, padding: 14 },
  metricValue: { fontSize: 26, fontWeight: 800, lineHeight: 1 },
  metricLabel: { marginTop: 6, fontSize: 13, color: '#607086' },
  errorBanner: { marginBottom: 16, border: '1px solid #eca1aa', background: '#fdebec', color: '#a31220', padding: 12, borderRadius: 8 },
  noticeBanner: { marginBottom: 16, border: '1px solid #bde4ca', background: '#eaf7ef', color: '#176b3a', padding: 12, borderRadius: 8 },
  workspace: { display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 16, alignItems: 'start' },
  commandLibrary: { background: '#fff', border: '1px solid #dfe5ec', borderRadius: 8, padding: 14 },
  sectionTitle: { margin: 0, fontSize: 18, lineHeight: 1.25 },
  appTabs: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  appTab: { border: '1px solid #d7dce3', background: '#fff', color: '#263241', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontSize: 13 },
  appTabActive: { border: '1px solid #263241', background: '#263241', color: '#fff', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontSize: 13 },
  templateList: { display: 'grid', gap: 8, marginTop: 14 },
  templateButton: { textAlign: 'right', border: '1px solid #dfe5ec', background: '#fafbfc', borderRadius: 8, padding: 10, cursor: 'pointer' },
  templateActive: { textAlign: 'right', border: '1px solid #7aa7d9', background: '#eef6ff', borderRadius: 8, padding: 10, cursor: 'pointer' },
  templateTitle: { display: 'block', fontWeight: 800, marginBottom: 3 },
  templateCommand: { display: 'block', color: '#506075', fontFamily: 'Consolas, monospace', fontSize: 12, marginBottom: 4 },
  templateDescription: { display: 'block', color: '#607086', fontSize: 13, lineHeight: 1.35 },
  commandForm: { background: '#fff', border: '1px solid #dfe5ec', borderRadius: 8, padding: 16 },
  formHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 },
  formHint: { marginTop: 6, color: '#607086', fontSize: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 },
  field: { display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#344254' },
  input: { width: '100%', minHeight: 36, border: '1px solid #cfd6df', borderRadius: 6, padding: '0 9px', background: '#fff', color: '#17202a' },
  textarea: { width: '100%', border: '1px solid #cfd6df', borderRadius: 6, padding: 9, resize: 'vertical', color: '#17202a' },
  codeTextarea: { width: '100%', border: '1px solid #cfd6df', borderRadius: 6, padding: 9, resize: 'vertical', direction: 'ltr', fontFamily: 'Consolas, monospace', fontSize: 12, color: '#17202a' },
  commandSummary: { marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 10, border: '1px solid #dfe5ec', background: '#f9fafc', borderRadius: 8, padding: 12, fontSize: 13 },
  inlineCheck: { marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#344254' },
  createButton: { marginTop: 12, width: '100%', height: 42, border: '1px solid #176b3a', background: '#176b3a', color: '#fff', borderRadius: 7, fontWeight: 800, cursor: 'pointer' },
  lowerGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, marginTop: 16, alignItems: 'start' },
  tablePanel: { background: '#fff', border: '1px solid #dfe5ec', borderRadius: 8, padding: 14, minWidth: 0 },
  tableHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 },
  tableTools: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  searchInput: { minWidth: 230, height: 34, border: '1px solid #cfd6df', borderRadius: 6, padding: '0 10px', background: '#fff', color: '#17202a' },
  smallSelect: { height: 34, border: '1px solid #cfd6df', borderRadius: 6, padding: '0 8px', background: '#fff', color: '#17202a' },
  muted: { color: '#607086', fontSize: 13 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { borderBottom: '1px solid #dfe5ec', background: '#f5f7fa', padding: 9, textAlign: 'right', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #edf1f5', padding: 9, textAlign: 'right', verticalAlign: 'top' },
  emptyCell: { padding: 22, textAlign: 'center', color: '#607086' },
  selectedRow: { background: '#f0f7ff' },
  mono: { fontFamily: 'Consolas, monospace', fontSize: 12 },
  smallId: { color: '#7a8797', fontSize: 11, wordBreak: 'break-all', marginTop: 3 },
  rowActions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  actionButton: { border: '1px solid #cfd6df', background: '#fff', borderRadius: 5, padding: '5px 8px', cursor: 'pointer' },
  dangerButton: { border: '1px solid #eca1aa', background: '#fdebec', color: '#a31220', borderRadius: 5, padding: '5px 8px', cursor: 'pointer' },
  sidePanels: { display: 'grid', gap: 12 },
  darkPanel: { background: '#111827', color: '#f6f8fb', padding: 14, borderRadius: 8 },
  darkTitle: { margin: 0, fontSize: 18 },
  darkMuted: { color: '#aab5c4', marginTop: 10 },
  auditItem: { borderTop: '1px solid #2a3546', padding: '9px 0', fontSize: 13 },
  lightPanel: { background: '#fff', border: '1px solid #dfe5ec', padding: 14, borderRadius: 8 },
  panelHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  pre: { margin: '12px 0 0', whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', fontSize: 12, background: '#f5f7fa', border: '1px solid #dfe5ec', borderRadius: 6, padding: 10, maxHeight: 420, overflow: 'auto' },
  badge: { display: 'inline-flex', alignItems: 'center', border: '1px solid', borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 800 },
  statusBadge: { display: 'inline-flex', alignItems: 'center', border: '1px solid #d7dce3', background: '#f9fafc', borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 800 }
};
