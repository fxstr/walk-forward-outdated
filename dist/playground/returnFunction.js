class BaseStrategy {
  constructor(nr) {
    this.name = 'base';
    this.nr = nr;
  }

  next(orders) {
    orders[this.nr || 1] = 'base';
  }

}

class OtherStrategy {
  constructor() {
    this.name = 'other';
  }

  next(orders) {
    orders.other = 5;
  }

}

function serialRunner(base, ...params) {
  params.forEach(param => {
    param.next(base);
  });
  return base;
}

function serial(...params) {
  return {
    //fn: serialRunner, 
    //params: params,
    next: base => {
      return serialRunner(base, ...params);
    }
  };
}

;
const s = serial(new BaseStrategy(5));
const result = serial(new BaseStrategy(), new OtherStrategy(), s);
console.log('s', s, 'res', result.next({
  result: 0
}));
//# sourceMappingURL=returnFunction.js.map