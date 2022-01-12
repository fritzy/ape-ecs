export class IdGenerator {

  gen_num: number;
  prefix: string;

  constructor() {
    this.gen_num = 0;
    this.prefix = '';
    this.genPrefix();
  }

  genPrefix(): void {
    this.prefix = Date.now().toString(32);
  }

  genId(): string {
    this.gen_num++;
    // istanbul ignore if
    if (this.gen_num === 4294967295) {
      this.gen_num = 0;
      this.genPrefix();
    }
    return this.prefix + this.gen_num;
  }
}
