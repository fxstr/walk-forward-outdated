function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

export default class ColumnConfig {
  constructor() {
    _defineProperty(this, "description", '');
  }

}
//# sourceMappingURL=ColumnConfig.mjs.map