import Dependency from './dependency';
export default class Requirer {
  constructor() {
    this.dep = new Dependency();
  }

  run() {
    return this.dep.run();
  }

}
//# sourceMappingURL=requirer.js.map