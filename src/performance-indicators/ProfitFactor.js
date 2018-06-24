export default class ProfitFactor {

    calculate(backtestInstance) {
        // For every position that was closed, calculate if it went up or down; sum up all ups 
        // and downs.
        const upAndDown = backtestInstance.positions.data.reduce((prev, entry) => {
            // key is an instrument or date or type. 
            entry.forEach((value) => {
                if (value.closedPositions) {
                    value.closedPositions.forEach((closedPosition) => {
                        if (closedPosition.value > 0) prev.up += closedPosition.value;
                        else prev.down += closedPosition.value;
                    });
                }
            });
            return prev;
        }, { up: 0, down: 0 });
        // Undefined if no data was provided
        if (upAndDown.up === 0 && upAndDown.down === 0) return undefined;
        return upAndDown.up / Math.abs(upAndDown.down);
    }

    getName() {
        return 'ProfitFactor';
    }

}