import type { AngleUnit, Value } from '../engine/values';

export type FractionResult = 'Improp Fraction' | 'Mixed Number';
export type DecimalMark = 'Dot' | 'Comma';
export type FormatKeyMode = 'Decimal' | 'Format Menu';
export type InputOutput = 'MathI/MathO' | 'MathI/DecimalO' | 'LineI/LineO' | 'LineI/DecimalO';
export type ExpKeyMode = 'Sci Notat' | 'Power';
export type NumberFormat = 'Norm 1' | 'Norm 2';
export type DigitSeparator = 'On' | 'Off';
export type AutoPowerOff = '10 Min.' | '60 Min.';
export type MultiLineFont = 'Normal Font' | 'Small Font';
export type ShowOptionNum = 'On' | 'Off';
export type QRCodeVersion = 'Version 3' | 'Version 11';

export interface CalcSettings {
  inputOutput: InputOutput;
  angleUnit: AngleUnit;
  numberFormat: NumberFormat;
  fractionResult: FractionResult;
  decimalMark: DecimalMark;
  digitSeparator: DigitSeparator;
  expKey: ExpKeyMode;
  formatKey: FormatKeyMode;
  autoPowerOff: AutoPowerOff;
  multiLineFont: MultiLineFont;
  showOptionNum: ShowOptionNum;
  contrast: number;
  qrCode: QRCodeVersion;
}

export const DEFAULT_SETTINGS: CalcSettings = {
  inputOutput: 'MathI/MathO',
  angleUnit: 'DEG',
  numberFormat: 'Norm 2',
  fractionResult: 'Improp Fraction',
  decimalMark: 'Dot',
  digitSeparator: 'On',
  expKey: 'Sci Notat',
  formatKey: 'Decimal',
  autoPowerOff: '10 Min.',
  multiLineFont: 'Normal Font',
  showOptionNum: 'On',
  contrast: 5,
  qrCode: 'Version 11',
};

export type SettingKey =
  | 'inputOutput'
  | 'angleUnit'
  | 'numberFormat'
  | 'fractionResult'
  | 'decimalMark'
  | 'digitSeparator'
  | 'expKey'
  | 'formatKey'
  | 'autoPowerOff'
  | 'multiLineFont'
  | 'showOptionNum'
  | 'contrast'
  | 'qrCode';

export type FormatAction = 'standard' | 'decimal' | 'improper' | 'mixed';
export type ResetAction = 'resetSettings' | 'initializeAll';

export type MenuPage =
  | 'settingsRoot'
  | 'calcSettings'
  | 'systemSettings'
  | 'reset'
  | 'getStarted'
  | 'angleUnit'
  | 'inputOutput'
  | 'numberFormat'
  | 'fractionResult'
  | 'decimalMark'
  | 'digitSeparator'
  | 'expKey'
  | 'formatKey'
  | 'autoPowerOff'
  | 'multiLineFont'
  | 'showOptionNum'
  | 'contrast'
  | 'qrCode'
  | 'formatMenu';

export interface MenuOption {
  label: string;
  value?: string | number;
  action?: FormatAction;
}

export interface MenuItem {
  label: string;
  detail?: string;
  target?: MenuPage;
  action?: ResetAction;
}

export interface MenuPageDef {
  title: string;
  parent: MenuPage | null;
  mode: 'list' | 'options' | 'message';
  items?: MenuItem[];
  options?: MenuOption[];
  setting?: SettingKey;
  message?: string[];
}

function angleUnitLabel(unit: AngleUnit): string {
  if (unit === 'DEG') return 'Degree';
  if (unit === 'RAD') return 'Radian';
  return 'Gradian';
}

function formatMenuOptions(value?: Value): MenuOption[] {
  const options: MenuOption[] = [
    { label: 'Standard', action: 'standard' },
    { label: 'Decimal', action: 'decimal' },
  ];

  if (value?.kind === 'exact' && value.exact.kind === 'rational' && value.exact.r.d !== 1n) {
    options.push({ label: 'Improp Fraction', action: 'improper' });
    const n = value.exact.r.n;
    if (n > value.exact.r.d || -n > value.exact.r.d) {
      options.push({ label: 'Mixed Number', action: 'mixed' });
    }
  }

  return options;
}

function optionPage(
  title: string,
  parent: MenuPage,
  setting: SettingKey,
  options: MenuOption[],
): MenuPageDef {
  return { title, parent, mode: 'options', setting, options };
}

export function getMenuPage(
  page: MenuPage,
  settings: CalcSettings,
  value?: Value,
): MenuPageDef {
  switch (page) {
    case 'settingsRoot':
      return {
        title: 'Settings',
        parent: null,
        mode: 'list',
        items: [
          { label: 'Calc Settings', target: 'calcSettings' },
          { label: 'System Settings', target: 'systemSettings' },
          { label: 'Reset', target: 'reset' },
          { label: 'Get Started', target: 'getStarted' },
        ],
      };

    case 'calcSettings':
      return {
        title: 'Calc Settings',
        parent: 'settingsRoot',
        mode: 'list',
        items: [
          { label: 'Input/Output', detail: settings.inputOutput, target: 'inputOutput' },
          { label: 'Angle Unit', detail: angleUnitLabel(settings.angleUnit), target: 'angleUnit' },
          { label: 'Number Format', detail: settings.numberFormat, target: 'numberFormat' },
          {
            label: 'Fraction Result',
            detail: settings.fractionResult === 'Improp Fraction' ? 'Improp' : 'Mixed',
            target: 'fractionResult',
          },
          { label: 'Decimal Mark', detail: settings.decimalMark, target: 'decimalMark' },
          { label: 'Digit Separator', detail: settings.digitSeparator, target: 'digitSeparator' },
          { label: '×10^x Key', detail: settings.expKey, target: 'expKey' },
          { label: 'FORMAT Key', detail: settings.formatKey, target: 'formatKey' },
        ],
      };

    case 'systemSettings':
      return {
        title: 'System Settings',
        parent: 'settingsRoot',
        mode: 'list',
        items: [
          { label: 'Contrast', detail: String(settings.contrast), target: 'contrast' },
          { label: 'Auto Power Off', detail: settings.autoPowerOff, target: 'autoPowerOff' },
          {
            label: 'MultiLine Font',
            detail: settings.multiLineFont === 'Normal Font' ? 'Normal' : 'Small',
            target: 'multiLineFont',
          },
          { label: 'Show Option Num', detail: settings.showOptionNum, target: 'showOptionNum' },
          { label: 'QR Code', detail: settings.qrCode, target: 'qrCode' },
        ],
      };

    case 'reset':
      return {
        title: 'Reset',
        parent: 'settingsRoot',
        mode: 'list',
        items: [
          { label: 'Reset Settings', action: 'resetSettings' },
          { label: 'Initialize All', action: 'initializeAll' },
        ],
      };

    case 'getStarted':
      return {
        title: 'Get Started',
        parent: null,
        mode: 'message',
        message: [
          'Press a number key to start.',
          'EXE evaluates. DEL edits.',
          'HOME shows the app grid.',
          'SETTINGS opens the options',
          'while in Calculate.',
        ],
      };

    case 'angleUnit':
      return optionPage('Angle Unit', 'calcSettings', 'angleUnit', [
        { label: 'Degree', value: 'DEG' },
        { label: 'Radian', value: 'RAD' },
        { label: 'Gradian', value: 'GRA' },
      ]);

    case 'inputOutput':
      return optionPage('Input/Output', 'calcSettings', 'inputOutput', [
        { label: 'MathI/MathO', value: 'MathI/MathO' },
        { label: 'MathI/DecimalO', value: 'MathI/DecimalO' },
        { label: 'LineI/LineO', value: 'LineI/LineO' },
        { label: 'LineI/DecimalO', value: 'LineI/DecimalO' },
      ]);

    case 'numberFormat':
      return optionPage('Number Format', 'calcSettings', 'numberFormat', [
        { label: 'Norm 1', value: 'Norm 1' },
        { label: 'Norm 2', value: 'Norm 2' },
      ]);

    case 'fractionResult':
      return optionPage('Fraction Result', 'calcSettings', 'fractionResult', [
        { label: 'Improp Fraction', value: 'Improp Fraction' },
        { label: 'Mixed Number', value: 'Mixed Number' },
      ]);

    case 'decimalMark':
      return optionPage('Decimal Mark', 'calcSettings', 'decimalMark', [
        { label: 'Dot', value: 'Dot' },
        { label: 'Comma', value: 'Comma' },
      ]);

    case 'digitSeparator':
      return optionPage('Digit Separator', 'calcSettings', 'digitSeparator', [
        { label: 'On', value: 'On' },
        { label: 'Off', value: 'Off' },
      ]);

    case 'expKey':
      return optionPage('×10^x Key', 'calcSettings', 'expKey', [
        { label: 'Sci Notat', value: 'Sci Notat' },
        { label: 'Power', value: 'Power' },
      ]);

    case 'formatKey':
      return optionPage('FORMAT Key', 'calcSettings', 'formatKey', [
        { label: 'Decimal', value: 'Decimal' },
        { label: 'Format Menu', value: 'Format Menu' },
      ]);

    case 'autoPowerOff':
      return optionPage('Auto Power Off', 'systemSettings', 'autoPowerOff', [
        { label: '10 Min.', value: '10 Min.' },
        { label: '60 Min.', value: '60 Min.' },
      ]);

    case 'multiLineFont':
      return optionPage('MultiLine Font', 'systemSettings', 'multiLineFont', [
        { label: 'Normal Font', value: 'Normal Font' },
        { label: 'Small Font', value: 'Small Font' },
      ]);

    case 'showOptionNum':
      return optionPage('Show Option Num', 'systemSettings', 'showOptionNum', [
        { label: 'On', value: 'On' },
        { label: 'Off', value: 'Off' },
      ]);

    case 'contrast':
      return optionPage(
        'Contrast',
        'systemSettings',
        'contrast',
        Array.from({ length: 9 }, (_, index) => ({
          label: String(index + 1),
          value: index + 1,
        })),
      );

    case 'qrCode':
      return optionPage('QR Code', 'systemSettings', 'qrCode', [
        { label: 'Version 3', value: 'Version 3' },
        { label: 'Version 11', value: 'Version 11' },
      ]);

    case 'formatMenu':
      return {
        title: 'Format',
        parent: null,
        mode: 'options',
        options: formatMenuOptions(value),
      };
  }
}

export function menuItemCount(page: MenuPageDef): number {
  if (page.mode === 'options') return page.options?.length ?? 0;
  if (page.mode === 'list') return page.items?.length ?? 0;
  return 0;
}

export function currentOptionIndex(
  page: MenuPageDef,
  settings: CalcSettings,
): number {
  if (page.mode !== 'options' || !page.setting) return 0;
  const current = String(settings[page.setting]);
  const index = page.options?.findIndex((option) => String(option.value) === current) ?? -1;
  return index >= 0 ? index : 0;
}

export function applySetting(
  settings: CalcSettings,
  key: SettingKey,
  value: string | number,
): CalcSettings {
  if (key === 'contrast') {
    return { ...settings, contrast: Number(value) };
  }
  return { ...settings, [key]: value } as CalcSettings;
}
