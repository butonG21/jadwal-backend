import moment from 'moment-timezone';

export class DateHelper {
  private static readonly INDONESIA_TIMEZONE = 'Asia/Jakarta';

  static getCurrentDateIndonesia(): string {
    return moment().tz(this.INDONESIA_TIMEZONE).format('YYYY-MM-DD');
  }

  static getCurrentTimestampIndonesia(): string {
    return moment().tz(this.INDONESIA_TIMEZONE).toISOString();
  }

  static formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
    return moment(date).tz(this.INDONESIA_TIMEZONE).format(format);
  }

  static parseDate(dateString: string): moment.Moment {
    return moment(dateString).tz(this.INDONESIA_TIMEZONE);
  }

  static isValidDate(dateString: string): boolean {
    return moment(dateString, 'YYYY-MM-DD', true).isValid();
  }

  static getDateRange(startDate: string, endDate: string): string[] {
    const start = moment(startDate);
    const end = moment(endDate);
    const dates: string[] = [];

    const current = start.clone();
    while (current.isSameOrBefore(end)) {
      dates.push(current.format('YYYY-MM-DD'));
      current.add(1, 'day');
    }

    return dates;
  }

  static getMonthInfo(month: number, year: number) {
    const date = moment(`${year}-${month.toString().padStart(2, '0')}-01`);
    return {
      startDate: date.format('YYYY-MM-DD'),
      endDate: date.endOf('month').format('YYYY-MM-DD'),
      monthName: date.format('MMMM'),
      daysInMonth: date.daysInMonth()
    };
  }
}
