// English strings. Keys are shared by si.ts and ta.ts (TypeScript checks they all exist).
export const en = {
  'app.name': 'Mathaka',
  'common.loading': 'Loading…',
  'common.language': 'Language',

  'role.title': 'Who will use this phone?',
  'role.family': 'Family / Memory Buddy phone',
  'role.familyHint': 'Set up medicines and see alerts.',
  'role.elder': 'Elder phone',
  'role.elderHint': 'A big, simple screen for daily medicine.',
  'role.later': 'You can change this later in family settings.',

  'slot.morning': 'Morning',
  'slot.noon': 'Noon',
  'slot.evening': 'Evening',
  'slot.night': 'Night',

  'elder.hello': 'Hello, {name}',
  'elder.today': "Today's medicine",
  'elder.taken': 'Taken',
  'elder.notYet': 'Not yet',
  'elder.tablets': '{n} tablets',
  'elder.tablet': '1 tablet',
  'elder.logoHint': 'Family: press and hold for 3 seconds',

  'family.title': 'Family',
  'family.medicines': 'Medicines',
  'family.history': 'Last 7 days',
  'family.taken': 'Taken',
  'family.missed': 'Missed',
  'family.prevented': 'Double dose stopped',
  'family.alerts': 'Alerts',
  'family.noAlerts': 'No alerts.',
  'family.alert.missed': '{name} did not confirm the {slot} medicine on {date}.',
  'family.alert.low_stock': '{medicine}: only {remaining} left. Please refill soon.',
  'family.alert.other': 'Alert: {kind}',
  'family.switchRole': 'Change phone role',
  'family.resetDemo': 'Reset demo data',
  'family.demo': 'DEMO MODE',
  'family.ai': 'AI: {kind}',
  'family.storage': 'Storage: {kind}',
  'family.left': '{n} left',
} as const;

export type StringKey = keyof typeof en;
