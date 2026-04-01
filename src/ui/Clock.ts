export class Clock {
  private el: HTMLElement;
  private timeEl: HTMLElement;
  private dateEl: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'clock-overlay';

    this.timeEl = document.createElement('div');
    this.timeEl.className = 'clock-time';

    this.dateEl = document.createElement('div');
    this.dateEl.className = 'clock-date';

    this.el.appendChild(this.timeEl);
    this.el.appendChild(this.dateEl);
    document.body.appendChild(this.el);
  }

  update(_dt: number) {
    const now = new Date();

    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    this.timeEl.textContent =
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    this.dateEl.textContent = now.toLocaleDateString(undefined, options);
  }
}
